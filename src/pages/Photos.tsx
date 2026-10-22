import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { CanWrite } from '../components/CanWrite'
import { LoadState } from '../components/LoadState'
import { BulkPhotoUploadDialog } from '../components/BulkPhotoUploadDialog'
import { PhotoLightbox } from '../components/PhotoLightbox'
import { formatNorwegianPhotoSectionHeader } from '../lib/dates'
import { formatLoadError } from '../lib/errors'
import { groupPhotosByDay } from '../lib/photoGroups'
import { projectPhotoMediaKind } from '../lib/projectMedia'
import {
  deleteProjectPhoto,
  fetchProject,
  fetchProjectPhotos,
} from '../lib/project'
import { usePhotoGridDisplayUrl } from '../hooks/usePhotoGridDisplayUrl'
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
  const canWrite = useCanWrite()

  async function deletePhoto(photo: ProjectPhoto) {
    if (!confirm('Slette denne filen permanent?')) return
    await deleteProjectPhoto(photo)
    onChanged()
  }

  function openPhoto(photo: ProjectPhoto) {
    const idx = flatPhotos.findIndex((p) => p.id === photo.id)
    if (idx >= 0) setLightboxIndex(idx)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bilder og video</h2>
          {photos.length > 0 ? (
            <p className="text-sm text-slate-600 tabular-nums">
              {photos.length} {photos.length === 1 ? 'fil' : 'filer'}
            </p>
          ) : null}
        </div>
        <CanWrite>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Last opp
          </button>
        </CanWrite>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          Ingen bilder eller video ennå.
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
                    <PhotoGridTile
                      photo={photo}
                      onOpen={() => openPhoto(photo)}
                      canDelete={canWrite}
                      onDelete={() => void deletePhoto(photo)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <BulkPhotoUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={onChanged}
      />

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
  canDelete,
  onDelete,
}: {
  photo: ProjectPhoto
  onOpen: () => void
  canDelete: boolean
  onDelete: () => void
}) {
  const isVideo = projectPhotoMediaKind(photo) === 'video'
  const { setRootElement, url, loading, retry } = usePhotoGridDisplayUrl(photo)
  const imgErrorRetried = useRef(false)

  return (
    <div
      ref={setRootElement}
      className="group relative aspect-square w-full"
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative h-full w-full overflow-hidden rounded-sm bg-slate-200 ring-0 transition hover:ring-2 hover:ring-slate-900/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
      >
      {url ? (
        <img
          src={url}
          alt=""
          decoding="async"
          onError={() => {
            if (imgErrorRetried.current) return
            imgErrorRetried.current = true
            retry()
          }}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <span className="flex h-full items-center justify-center bg-slate-300 text-xs text-slate-600">
          {loading ? '…' : isVideo ? 'Video' : '?'}
        </span>
      )}
      {isVideo ? (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/25"
          aria-hidden
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md">
            ▶
          </span>
        </span>
      ) : null}
      </button>
      {canDelete ? (
        <button
          type="button"
          aria-label="Slett"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-1 right-1 z-10 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-0 transition hover:bg-red-700 group-hover:opacity-100 focus-visible:opacity-100"
        >
          Slett
        </button>
      ) : null}
    </div>
  )
}
