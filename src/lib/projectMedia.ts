import type { ProjectPhoto } from './types'

export type ProjectMediaKind = 'photo' | 'video'

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mkv',
  'avi',
  '3gp',
])

export function mediaKindFromStoragePath(path: string): ProjectMediaKind {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.has(ext) ? 'video' : 'photo'
}

export function mediaKindFromFile(file: File): ProjectMediaKind {
  if (file.type.startsWith('video/')) return 'video'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.has(ext) ? 'video' : 'photo'
}

export function isVideoUploadFile(file: File): boolean {
  return mediaKindFromFile(file) === 'video'
}

export function isImageUploadFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  const lower = file.name.toLowerCase()
  return lower.endsWith('.heic') || lower.endsWith('.heif')
}

export function isGalleryUploadFile(file: File): boolean {
  return isImageUploadFile(file) || isVideoUploadFile(file)
}

export function projectPhotoMediaKind(photo: ProjectPhoto): ProjectMediaKind {
  return mediaKindFromStoragePath(photo.storage_path)
}
