import { useEffect, useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { downloadFileFromUrl } from '../lib/fileDownload'
import { formatNorwegianDateTime } from '../lib/dates'
import {
  PROJECT_PHOTOS_BUCKET,
  deleteProjectPhoto,
  signedStorageUrl,
  updateProjectPhoto,
} from '../lib/project'
import { previewObjectUrlForRemote } from '../lib/receiptPreview'
import type { ProjectPhoto } from '../lib/types'

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  onChanged,
}: {
  photos: ProjectPhoto[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
  onChanged: () => void
}) {
  const canWrite = useCanWrite()
  const photo = photos[index]
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState(photo?.caption ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!photo) return
    setCaption(photo.caption)
  }, [photo])

  useEffect(() => {
    if (!photo) return
    let cancelled = false
    let blobUrl: string | null = null
    setLoading(true)
    setDisplayUrl(null)
    setDownloadUrl(null)

    void (async () => {
      const signed = await signedStorageUrl(PROJECT_PHOTOS_BUCKET, photo.storage_path)
      if (cancelled || !signed) {
        if (!cancelled) setLoading(false)
        return
      }
      setDownloadUrl(signed)
      const fileName = photo.storage_path.split('/').pop() ?? 'bilde.jpg'
      try {
        const preview = await previewObjectUrlForRemote(signed, fileName)
        if (cancelled) {
          if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
          return
        }
        if (preview.startsWith('blob:')) blobUrl = preview
        setDisplayUrl(preview)
      } catch {
        if (!cancelled) setDisplayUrl(signed)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [photo])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (index > 0) onIndexChange(index - 1)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (index < photos.length - 1) onIndexChange(index + 1)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey, true)
    }
  }, [index, photos.length, onClose, onIndexChange])

  if (!photo) return null

  const fileName = photo.storage_path.split('/').pop() ?? 'bilde.jpg'

  async function saveCaption() {
    if (!photo) return
    setBusy(true)
    try {
      await updateProjectPhoto(photo.id, { caption })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!photo || !confirm('Slette dette bildet permanent?')) return
    setBusy(true)
    try {
      await deleteProjectPhoto(photo)
      onChanged()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95"
      role="dialog"
      aria-modal="true"
      aria-label="Bildevisning"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="min-w-0 text-sm text-white">
          <p className="font-medium tabular-nums">
            {index + 1} / {photos.length}
          </p>
          <p className="text-white/70">{formatNorwegianDateTime(photo.taken_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => onIndexChange(index - 1)}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Forrige
          </button>
          <button
            type="button"
            disabled={index >= photos.length - 1}
            onClick={() => onIndexChange(index + 1)}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Neste
          </button>
          {downloadUrl ? (
            <button
              type="button"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
              onClick={() =>
                void downloadFileFromUrl(downloadUrl, fileName).catch(() =>
                  window.open(downloadUrl, '_blank', 'noopener,noreferrer'),
                )
              }
            >
              Last ned
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
          >
            Lukk
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4">
        {loading ? (
          <p className="text-sm text-white/70">Laster bilde …</p>
        ) : displayUrl ? (
          <img
            src={displayUrl}
            alt={caption.trim() || 'Prosjektbilde'}
            className="max-h-[calc(100vh-11rem)] max-w-full object-contain"
          />
        ) : (
          <p className="text-sm text-white/70">Kunne ikke vise bildet.</p>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-slate-950/80 px-3 py-3 sm:px-4">
        {canWrite ? (
          <div className="mx-auto flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm text-white">
              <span className="text-white/70">Bildetekst</span>
              <input
                className="input mt-1 border-white/20 bg-white/10 text-white placeholder:text-white/40"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={busy}
                placeholder="Valgfri tekst …"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveCaption()}
              className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-50"
            >
              Lagre tekst
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-lg border border-red-400/40 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-50"
            >
              Slett
            </button>
          </div>
        ) : caption.trim() ? (
          <p className="mx-auto max-w-xl text-center text-sm text-white/90">{caption}</p>
        ) : null}
      </div>
    </div>
  )
}
