import { useCallback, useEffect, useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { fetchAuditLog } from '../lib/auditLog'
import { formatNorwegianDateTime } from '../lib/dates'
import { fetchProject } from '../lib/project'
import type { AuditLogEntry } from '../lib/types'

export function AuditLogPanel() {
  const canWrite = useCanWrite()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const reload = useCallback(async () => {
    if (!canWrite) return
    setLoading(true)
    setError(null)
    try {
      const project = await fetchProject()
      if (!project) {
        setEntries([])
        return
      }
      setEntries(await fetchAuditLog(project.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke laste logg')
    } finally {
      setLoading(false)
    }
  }, [canWrite])

  useEffect(() => {
    if (!canWrite) return
    void reload()
    function onUpdate() {
      void reload()
    }
    window.addEventListener('audit-log-updated', onUpdate)
    return () => window.removeEventListener('audit-log-updated', onUpdate)
  }, [canWrite, reload])

  if (!canWrite) return null

  return (
    <section className="mt-10 border-t border-slate-200 pt-6">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-slate-700"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Aktivitetslogg (hvem gjorde hva)</span>
        <span className="text-slate-400" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
          {loading && entries.length === 0 ? (
            <p className="px-4 py-3 text-slate-500">Laster …</p>
          ) : null}
          {error ? (
            <p className="px-4 py-3 text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && entries.length === 0 ? (
            <p className="px-4 py-3 text-slate-500">Ingen endringer logget ennå.</p>
          ) : null}
          {entries.length > 0 ? (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {entries.map((e) => (
                <li key={e.id} className="px-4 py-2.5">
                  <p className="text-slate-900">{e.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatNorwegianDateTime(e.created_at)} ·{' '}
                    <span className="font-medium text-slate-600">{e.actor}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
