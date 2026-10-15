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
    if (!authEnabled) return
    let cancelled = false
    void (async () => {
      const token = loadStoredAccessToken()
      if (!token) {
        if (!cancelled) {
          setRole('none')
          setBooting(false)
        }
        return
      }
      const validated = await validateSessionToken(token)
      if (cancelled) return
      if (validated) {
        setRole(validated)
      } else {
        clearStoredAccessToken()
        setRole('none')
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
    storeAccessToken(result.token)
    setRole(result.role)
    return true
  }, [])

  const upgradeToFull = useCallback(async (password: string) => {
    const result = await loginWithPassword(password)
    if (result === 'unavailable') return 'unavailable'
    if (!result || result.role !== 'full') return false
    storeAccessToken(result.token)
    setRole('full')
    return true
  }, [])

  const logout = useCallback(() => {
    clearStoredAccessToken()
    setRole(authEnabled ? 'none' : 'full')
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
