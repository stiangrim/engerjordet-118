import { useState } from 'react'
import { useAccess } from '../access/AccessContext'
import {
  ProjectTitleProvider,
  useProjectTitle,
} from '../context/ProjectTitleContext'

type Props = {
  children: React.ReactNode
}

export function AccessGate({ children }: Props) {
  const { role, authEnabled, booting, login } = useAccess()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!authEnabled) {
    return children
  }

  if (booting) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Laster …</p>
      </div>
    )
  }

  if (role !== 'none') {
    return children
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!password.trim()) {
      setError('Skriv inn passord.')
      return
    }
    setBusy(true)
    void login(password)
      .then((ok) => {
        if (ok === 'unavailable') {
          setError('Innlogging er ikke tilgjengelig.')
          return
        }
        if (!ok) {
          setError('Feil passord.')
          setPassword('')
        }
      })
      .finally(() => setBusy(false))
  }

  return (
    <ProjectTitleProvider loadFromDatabase={false}>
      <LoginScreen
        password={password}
        setPassword={setPassword}
        error={error}
        busy={busy}
        onSubmit={submit}
      />
    </ProjectTitleProvider>
  )
}

function LoginScreen({
  password,
  setPassword,
  error,
  busy,
  onSubmit,
}: {
  password: string
  setPassword: (v: string) => void
  error: string | null
  busy: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  const projectTitle = useProjectTitle()

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {projectTitle}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Logg inn</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Passord</span>
            <input
              type="password"
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              disabled={busy}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Sjekker …' : 'Logg inn'}
          </button>
        </form>
      </div>
    </div>
  )
}
