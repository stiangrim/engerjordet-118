import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAccess } from '../access/AccessContext'
import { useProjectTitle } from '../context/ProjectTitleContext'
import { AuditLogPanel } from './AuditLogPanel'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

export function Layout() {
  const { authEnabled, isReadOnly, canWrite, logout } = useAccess()
  const projectTitle = useProjectTitle()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      {isReadOnly ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
          <span className="font-medium">Kun lesemodus</span>
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="ml-3 font-medium underline hover:no-underline"
          >
            Logg inn for redigering
          </button>
        </div>
      ) : null}
      {upgradeOpen ? (
        <div className="fixed inset-0 z-[100]">
          <AccessGateUpgrade
            onClose={() => setUpgradeOpen(false)}
          />
        </div>
      ) : null}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Totalrenovering
            </p>
            <h1 className="text-xl font-semibold">{projectTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={linkClass}>
              Oversikt
            </NavLink>
            <NavLink to="/budsjett" className={linkClass}>
              Budsjett
            </NavLink>
            <NavLink to="/plan" className={linkClass}>
              Plan
            </NavLink>
            <NavLink to="/bilder" className={linkClass}>
              Bilder
            </NavLink>
            <NavLink to="/kostnader" className={linkClass}>
              Kostnader
            </NavLink>
          </nav>
          {authEnabled ? (
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title={canWrite ? 'Logg ut' : 'Logg ut (lesetilgang)'}
            >
              Logg ut
            </button>
          ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
        <AuditLogPanel />
      </main>
    </div>
  )
}

function AccessGateUpgrade({ onClose }: { onClose: () => void }) {
  const { upgradeToFull } = useAccess()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    void upgradeToFull(password)
      .then((ok) => {
        if (ok === true) {
          onClose()
          return
        }
        if (ok === 'unavailable') {
          setError('Innlogging er ikke tilgjengelig.')
          return
        }
        setError('Feil passord.')
        setPassword('')
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold">Redigering</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={busy}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Sjekker …' : 'Logg inn'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
