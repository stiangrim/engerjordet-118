import exifr from 'exifr'
import { isVideoUploadFile } from './projectMedia'

export type PhotoDimensions = { width: number; height: number }

function firstValidDate(...values: unknown[]): Date | null {
  for (const v of values) {
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  }
  return null
}

/** Tatt-tid fra EXIF / video-metadata, ellers fil-metadata. */
export async function readPhotoTakenAt(file: File): Promise<Date> {
  try {
    const pick = isVideoUploadFile(file)
      ? [
          'MediaCreateDate',
          'CreateDate',
          'ModifyDate',
          'DateTimeOriginal',
          'TrackCreateDate',
        ]
      : ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'MediaCreateDate']
    const parsed = await exifr.parse(file, { pick })
    const candidate = firstValidDate(
      parsed?.DateTimeOriginal,
      parsed?.MediaCreateDate,
      parsed?.TrackCreateDate,
      parsed?.CreateDate,
      parsed?.ModifyDate,
    )
    if (candidate) return candidate
  } catch {
    /* metadata mangler eller uleselig */
  }
  if (file.lastModified > 0) {
    return new Date(file.lastModified)
  }
  return new Date()
}

export async function readPhotoDimensions(
  file: File,
): Promise<PhotoDimensions | null> {
  if (isVideoUploadFile(file)) {
    return dimensionsFromVideoFile(file)
  }
  try {
    const dims = await exifr.parse(file, { pick: ['ImageWidth', 'ImageHeight'] })
    const w = Number(dims?.ImageWidth)
    const h = Number(dims?.ImageHeight)
    if (w > 0 && h > 0) return { width: w, height: h }
  } catch {
    /* ignore */
  }
  try {
    return await dimensionsFromImageFile(file)
  } catch {
    return null
  }
}

function dimensionsFromVideoFile(file: File): Promise<PhotoDimensions | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve({ width: video.videoWidth, height: video.videoHeight })
      } else resolve(null)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    video.src = url
  })
}

function dimensionsFromImageFile(file: File): Promise<PhotoDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Kunne ikke lese bildestørrelse'))
    }
    img.src = url
  })
}
