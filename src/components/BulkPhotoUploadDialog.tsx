import { useEffect, useId, useRef, useState } from 'react'
import { formatRoughDurationMs } from '../lib/dates'
import { fetchProject, recordProjectPhotosBulkAudit } from '../lib/project'
import { isGalleryUploadFile } from '../lib/photoGroups'
import {
  runBulkPhotoUpload,
  type BulkPhotoUploadProgress,
} from '../lib/bulkPhotoUpload'

const emptyProgress = (): BulkPhotoUploadProgress => ({
  total: 0,
  completed: 0,
  succeeded: 0,
  failed: 0,
  inFlight: [],
  lastError: null,
})

export function BulkPhotoUploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  onUploaded: () => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)
  const startedAtRef = useRef(0)

  const [dragOver, setDragOver] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [progress, setProgress] = useState(emptyProgress)
  const [failedNames, setFailedNames] = useState<string[]>([])
  const [cancelled, setCancelled] = useState(false)
  const [etaMs, setEtaMs] = useState<number | null>(null)

  useEffect(() => {
    if (!open) {
      cancelRef.current = false
      setPhase('idle')
      setProgress(emptyProgress())
      setFailedNames([])
      setCancelled(false)
      setEtaMs(null)
    }
  }, [open])

  useEffect(() => {
    if (phase !== 'uploading' || progress.completed <= 0) {
      setEtaMs(null)
      return
    }
    const elapsed = Date.now() - startedAtRef.current
    const perFile = elapsed / progress.completed
    const left = progress.total - progress.completed
    setEtaMs(perFile * left)
  }, [phase, progress.completed, progress.total])

  if (!open) return null

  function requestCancel() {
    cancelRef.current = true
  }

  async function startUpload(fileList: FileList | File[]) {
    const files = [...fileList].filter(isGalleryUploadFile)
    if (files.length === 0) return

    const project = await fetchProject()
    if (!project) return

    cancelRef.current = false
    setCancelled(false)
    setFailedNames([])
    setPhase('uploading')
    startedAtRef.current = Date.now()
    setProgress({ ...emptyProgress(), total: files.length })

    const result = await runBulkPhotoUpload({
      projectId: project.id,
      files,
      isCancelled: () => cancelRef.current,
      onProgress: setProgress,
    })

    setFailedNames(result.failed)
    setCancelled(result.cancelled)
    setPhase('done')

    if (result.succeeded > 0) {
      void recordProjectPhotosBulkAudit(project.id, result.succeeded)
      onUploaded()
    }
  }

  const pct =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-upload-title"
      >
        <h3 id="bulk-upload-title" className="text-lg font-semibold">
          {phase === 'uploading' ? 'Laster opp …' : 'Last opp bilder og video'}
        </h3>

        {phase === 'uploading' ? (
          <div className="mt-4 space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-sm font-medium text-slate-900 tabular-nums">
              {progress.completed} av {progress.total} · {pct}%
            </p>
            {etaMs !== null && progress.completed < progress.total ? (
              <p className="text-sm text-slate-600">
                Gjenstår {formatRoughDurationMs(etaMs)}
              </p>
            ) : null}
            {progress.inFlight.length > 0 ? (
              <ul className="max-h-28 overflow-auto text-xs text-slate-600">
                {progress.inFlight.map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={requestCancel}
              className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Avbryt
            </button>
          </div>
        ) : null}

        {phase === 'done' ? (
          <div className="mt-4 space-y-2 text-sm">
            {cancelled ? (
              <p className="font-medium text-amber-900">Opplasting avbrutt.</p>
            ) : null}
            <p className="text-slate-800">
              {progress.succeeded} lastet opp
              {failedNames.length > 0 ? ` · ${failedNames.length} feilet` : ''}
            </p>
            {failedNames.length > 0 ? (
              <ul className="max-h-24 overflow-auto text-red-700">
                {failedNames.map((n) => (
                  <li key={n} className="truncate">
                    {n}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {phase === 'idle' ? (
          <>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/*,.heic,.heif,video/*,.mp4,.mov,.m4v,.webm"
              multiple
              className="sr-only"
              onChange={(e) => {
                const list = e.target.files
                if (list?.length) void startUpload(list)
                e.target.value = ''
              }}
            />
            <div
              onDragEnter={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragOver(false)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const dropped = e.dataTransfer.files
                if (dropped?.length) void startUpload(dropped)
              }}
              className={`mt-4 rounded-xl border-2 border-dashed px-4 py-10 text-center ${
                dragOver ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <p className="text-sm font-medium text-slate-800">
                Dra hit eller velg filer
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Velg filer
              </button>
            </div>
          </>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          {phase === 'done' ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Lukk
            </button>
          ) : (
            <button
              type="button"
              disabled={phase === 'uploading'}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              Lukk
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
