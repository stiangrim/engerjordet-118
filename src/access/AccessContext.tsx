import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loginWithPassword,
  validateSessionToken,
} from '../lib/accessApi'
import {
  accessAuthEnabled,
  clearStoredAccessToken,
  loadStoredAccessToken,
  storeAccessToken,
  type AccessRole,
} from './accessConfig'
import { setAuditSession } from '../lib/auditSession'
import { supabase } from '../lib/supabase'

type AccessContextValue = {
  role: AccessRole
  authEnabled: boolean
  booting: boolean
  canWrite: boolean
  isReadOnly: boolean
  login: (password: string) => Promise<boolean | 'unavailable'>
  upgradeToFull: (password: string) => Promise<boolean | 'unavailable'>
  logout: () => void
}

const AccessContext = createContext<AccessContextValue | null>(null)

export function AccessProvider({ children }: { children: ReactNode }) {
  const authEnabled = accessAuthEnabled()
  const [role, setRole] = useState<AccessRole>(() =>
    authEnabled ? 'none' : 'full',
  )
  const [booting, setBooting] = useState(authEnabled)

  useEffect(() => {
    if (!authEnabled) {
      setAuditSession({ actor: 'Utvikling', role: 'full' })
      return
    }
    let cancelled = false
    void (async () => {
      const token = loadStoredAccessToken()
      if (!token) {
        if (!cancelled) {
          setRole('none')
          setAuditSession(null)
          setBooting(false)
        }
        return
      }
      const validated = await validateSessionToken(token)
      // Data is only readable with the Supabase session the login handed out;
      // a token from before that change has none, so it has to log in again.
      const { data: auth } = await supabase.auth.getSession()
      if (cancelled) return
      if (validated && auth.session) {
        setRole(validated.role)
        storeAccessToken(token, validated.actor)
        setAuditSession({ role: validated.role, actor: validated.actor })
      } else {
        clearStoredAccessToken()
        void supabase.auth.signOut({ scope: 'local' })
        setRole('none')
        setAuditSession(null)
      }
      setBooting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [authEnabled])

  const login = useCallback(async (password: string) => {
    const result = await loginWithPassword(password)
    if (result === 'unavailable') return 'unavailable'
    if (!result) return false
    const { error: sessionError } = await supabase.auth.setSession(result.session)
    if (sessionError) return 'unavailable'
    storeAccessToken(result.token, result.actor)
    setRole(result.role)
    setAuditSession({ role: result.role, actor: result.actor })
    return true
  }, [])

  const upgradeToFull = useCallback(async (password: string) => {
    const result = await loginWithPassword(password)
    if (result === 'unavailable') return 'unavailable'
    if (!result || result.role !== 'full') return false
    const { error: sessionError } = await supabase.auth.setSession(result.session)
    if (sessionError) return 'unavailable'
    storeAccessToken(result.token, result.actor)
    setRole('full')
    setAuditSession({ role: 'full', actor: result.actor })
    return true
  }, [])

  const logout = useCallback(() => {
    clearStoredAccessToken()
    void supabase.auth.signOut({ scope: 'local' })
    setRole(authEnabled ? 'none' : 'full')
    setAuditSession(authEnabled ? null : { actor: 'Utvikling', role: 'full' })
  }, [authEnabled])

  const value = useMemo(
    (): AccessContextValue => ({
      role,
      authEnabled,
      booting,
      canWrite: role === 'full',
      isReadOnly: role === 'readonly',
      login,
      upgradeToFull,
      logout,
    }),
    [authEnabled, booting, login, logout, role, upgradeToFull],
  )

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  )
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext)
  if (!ctx) {
    throw new Error('useAccess must be used within AccessProvider')
  }
  return ctx
}

export function useCanWrite(): boolean {
  return useAccess().canWrite
}
