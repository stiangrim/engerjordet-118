import type { ProjectPhoto } from './types'
import { toIsoDateLocal } from './dates'

export type PhotoDayGroup = {
  dayKey: string
  takenAt: string
  photos: ProjectPhoto[]
}

/** Nyeste dato først; bilder innenfor dag sortert etter tatt-tid (nyeste først). */
export function groupPhotosByDay(photos: ProjectPhoto[]): PhotoDayGroup[] {
  const byDay = new Map<string, ProjectPhoto[]>()

  for (const photo of photos) {
    const key = localDayKeyFromIso(photo.taken_at)
    const list = byDay.get(key)
    if (list) list.push(photo)
    else byDay.set(key, [photo])
  }

  const groups: PhotoDayGroup[] = []
  for (const [dayKey, list] of byDay) {
    list.sort(
      (a, b) =>
        new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime(),
    )
    groups.push({
      dayKey,
      takenAt: list[0]?.taken_at ?? `${dayKey}T12:00:00.000Z`,
      photos: list,
    })
  }

  groups.sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
  )
  return groups
}

function localDayKeyFromIso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return toIsoDateLocal(d)
}

export function isImageUploadFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  const lower = file.name.toLowerCase()
  return lower.endsWith('.heic') || lower.endsWith('.heif')
}
