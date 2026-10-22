import exifr from 'exifr'

export type PhotoDimensions = { width: number; height: number }

/** Tatt-tid fra EXIF (DateTimeOriginal), ellers fil-metadata. */
export async function readPhotoTakenAt(file: File): Promise<Date> {
  try {
    const parsed = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
    })
    const candidate =
      parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? parsed?.ModifyDate
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate
    }
  } catch {
    /* EXIF mangler eller uleselig */
  }
  if (file.lastModified > 0) {
    return new Date(file.lastModified)
  }
  return new Date()
}

export async function readPhotoDimensions(
  file: File,
): Promise<PhotoDimensions | null> {
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
