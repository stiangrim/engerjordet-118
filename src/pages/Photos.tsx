import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CanWrite } from '../components/CanWrite'
import { LoadState } from '../components/LoadState'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { mapWithConcurrency } from '../lib/asyncPool'
import { formatNorwegianPhotoSectionHeader } from '../lib/dates'
import { formatLoadError } from '../lib/errors'
import { groupPhotosByDay, isImageUploadFile } from '../lib/photoGroups'
import {
  fetchProject,
  fetchProjectPhotos,
  PROJECT_PHOTOS_BUCKET,
  recordProjectPhotosBulkAudit,
} from '../lib/project'
import { uploadProjectPhotoFile } from '../lib/uploadProjectPhoto'
import { useSignedStorageUrl } from '../hooks/useSignedStorageUrl'
import type { ProjectPhoto } from '../lib/types'

export function PhotosPage() {
  const [photos, setPhotos] = useState<ProjectPhoto[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const project = await fetchProject()
      if (!project) {
        setPhotos(null)
        setError('Fant ikke prosjekt.')
        return
      }
      setPhotos(await fetchProjectPhotos(project.id))
    } catch (e) {
      setError(formatLoadError(e))
      setPhotos(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <LoadState loading={loading} error={error} empty={!photos} emptyMessage="">
      {photos ? (
        <PhotosContent photos={photos} onChanged={() => void reload()} />
      ) : null}
    </LoadState>
  )
}

function PhotosContent({
  photos,
  onChanged,
}: {
  photos: ProjectPhoto[]
  onChanged: () => void
}) {
  const groups = useMemo(() => groupPhotosByDay(photos), [photos])
  const flatPhotos = useMemo(
    () => groups.flatMap((g) => g.photos),
    [groups],
  )
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  function openPhoto(photo: ProjectPhoto) {
    const idx = flatPhotos.findIndex((p) => p.id === photo.id)
    if (idx >= 0) setLightboxIndex(idx)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bilder</h2>
          <p className="text-sm text-slate-600">
            {photos.length}{' '}
            {photos.length === 1 ? 'bilde' : 'bilder'} · gruppert etter når de
            er tatt (EXIF)
          </p>
        </div>
        <CanWrite>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Last opp bilder
          </button>
        </CanWrite>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Ingen bilder ennå. Last opp mange på én gang – de sorteres etter dato
          fra kameraet.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.dayKey}>
              <h3 className="sticky top-0 z-10 -mx-4 mb-2 border-b border-slate-200/80 bg-slate-50/95 px-4 py-2 text-sm font-semibold text-slate-800 backdrop-blur-sm">
                {formatNorwegianPhotoSectionHeader(group.takenAt)}
                <span className="ml-2 font-normal text-slate-500 tabular-nums">
                  ({group.photos.length})
                </span>
              </h3>
              <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {group.photos.map((photo) => (
                  <li key={photo.id}>
                    <PhotoGridTile photo={photo} onOpen={() => openPhoto(photo)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {uploadOpen ? (
        <BulkPhotoUploadPanel
          onClose={() => setUploadOpen(false)}
          onDone={(projectId, count) => {
            setUploadOpen(false)
            if (count > 0) void recordProjectPhotosBulkAudit(projectId, count)
            onChanged()
          }}
        />
      ) : null}

      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={flatPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  )
}

function PhotoGridTile({
  photo,
  onOpen,
}: {
  photo: ProjectPhoto
  onOpen: () => void
}) {
  const path = photo.thumb_path ?? photo.storage_path
  const { url, loading } = useSignedStorageUrl(PROJECT_PHOTOS_BUCKET, path)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-square w-full overflow-hidden rounded-sm bg-slate-200 ring-0 transition hover:ring-2 hover:ring-slate-900/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
    >
      {url ? (
        <img
          src={url}
          alt={photo.caption.trim() || 'Prosjektbilde'}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-xs text-slate-500">
          {loading ? '…' : '?'}
        </span>
      )}
    </button>
  )
}

function BulkPhotoUploadPanel({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: (projectId: string, uploadedCount: number) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [errors, setErrors] = useState<string[]>([])

  async function handleFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter(isImageUploadFile)
    if (files.length === 0) return

    const project = await fetchProject()
    if (!project) return

    setBusy(true)
    setErrors([])
    setProgress({ done: 0, total: files.length })

    const failed: string[] = []
    let uploaded = 0

    await mapWithConcurrency(files, 3, async (file) => {
      try {
        await uploadProjectPhotoFile(project.id, file)
        uploaded += 1
      } catch {
        failed.push(file.name)
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1 }))
      }
    })

    setBusy(false)
    setErrors(failed.map((n) => `Kunne ikke laste opp: ${n}`))
    if (uploaded > 0) onDone(project.id, uploaded)
    else if (failed.length === 0) onClose()
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-upload-title"
      >
        <h3 id="bulk-upload-title" className="text-lg font-semibold">
          Last opp bilder
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Velg mange filer samtidig. Dato hentes fra EXIF (DateTimeOriginal) når
          den finnes.
        </p>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const list = e.target.files
            if (list?.length) void handleFiles(list)
            e.target.value = ''
          }}
        />

        <div
          onDragEnter={(e) => {
            e.preventDefault()
            if (!busy) setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (busy) return
            const dropped = e.dataTransfer.files
            if (dropped?.length) void handleFiles(dropped)
          }}
          className={`mt-4 rounded-xl border-2 border-dashed px-4 py-10 text-center ${
            dragOver ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-slate-50'
          } ${busy ? 'opacity-60' : ''}`}
        >
          {busy ? (
            <p className="text-sm font-medium text-slate-800">
              Laster opp … {progress.done} / {progress.total}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-800">
                Dra bilder hit eller velg fra enheten
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Velg bilder
              </button>
            </>
          )}
        </div>

        {errors.length > 0 ? (
          <ul className="mt-3 max-h-24 overflow-auto text-sm text-red-700">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            {busy ? 'Vent …' : 'Lukk'}
          </button>
        </div>
      </div>
    </div>
  )
}
