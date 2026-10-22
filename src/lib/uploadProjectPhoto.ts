import { createPhotoThumbnail } from './photoThumb'
import { readPhotoDimensions, readPhotoTakenAt } from './photoMetadata'
import {
  createProjectPhoto,
  uploadProjectPhotoStorage,
  type ProjectPhotoWrite,
} from './project'
import { isVideoUploadFile } from './projectMedia'
import type { ProjectPhoto } from './types'

function storageExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  if (file.type === 'video/mp4') return 'mp4'
  if (file.type === 'video/quicktime') return 'mov'
  if (file.type === 'video/webm') return 'webm'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return isVideoUploadFile(file) ? 'mp4' : 'jpg'
}

export async function uploadProjectPhotoFile(
  projectId: string,
  file: File,
): Promise<ProjectPhoto> {
  const takenAt = await readPhotoTakenAt(file)
  const dimensions = await readPhotoDimensions(file)
  const fileId = crypto.randomUUID()
  const storage_path = `${projectId}/${fileId}.${storageExtension(file)}`

  await uploadProjectPhotoStorage(storage_path, file)

  let thumb_path: string | null = null
  try {
    const thumb = await createPhotoThumbnail(file)
    if (thumb) {
      thumb_path = `${projectId}/${fileId}_thumb.jpg`
      await uploadProjectPhotoStorage(thumb_path, thumb, 'image/jpeg')
    }
  } catch {
    /* miniatyr er valgfri */
  }

  const write: ProjectPhotoWrite = {
    storage_path,
    thumb_path,
    taken_at: takenAt.toISOString(),
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  }

  return createProjectPhoto(projectId, write)
}
