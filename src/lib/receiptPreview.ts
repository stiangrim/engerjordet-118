import heic2any from 'heic2any'

export function isHeicLike(nameOrFile: string | File): boolean {
  const name =
    typeof nameOrFile === 'string' ? nameOrFile : nameOrFile.name
  const type =
    typeof nameOrFile === 'string'
      ? ''
      : nameOrFile.type.toLowerCase()
  const lower = name.toLowerCase()
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return true
  return type === 'image/heic' || type === 'image/heif'
}

export function isPdfLike(nameOrFile: string | File): boolean {
  const name =
    typeof nameOrFile === 'string' ? nameOrFile : nameOrFile.name
  const type =
    typeof nameOrFile === 'string'
      ? ''
      : nameOrFile.type.toLowerCase()
  return (
    type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')
  )
}

export function isRasterImageLike(file: File): boolean {
  if (file.type.startsWith('image/') && !isHeicLike(file)) return true
  const lower = file.name.toLowerCase()
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif')
  )
}

export function canPreviewReceiptFile(file: File): boolean {
  return isPdfLike(file) || isRasterImageLike(file) || isHeicLike(file)
}

async function heicBlobToJpegObjectUrl(blob: Blob): Promise<string> {
  const converted = await heic2any({
    blob,
    toType: 'image/jpeg',
    quality: 0.92,
  })
  const out = Array.isArray(converted) ? converted[0] : converted
  return URL.createObjectURL(out)
}

/** Object URL for forhåndsvisning (HEIC konverteres til JPEG). */
export async function previewObjectUrlForFile(file: File): Promise<string> {
  if (isHeicLike(file)) {
    return heicBlobToJpegObjectUrl(file)
  }
  return URL.createObjectURL(file)
}

/** For lagrede filer: signed URL eller konvertert HEIC. */
export async function previewObjectUrlForRemote(
  signedUrl: string,
  fileName: string,
): Promise<string> {
  if (!isHeicLike(fileName)) {
    return signedUrl
  }
  const res = await fetch(signedUrl)
  if (!res.ok) {
    throw new Error(`Kunne ikke hente fil (${res.status})`)
  }
  const blob = await res.blob()
  return heicBlobToJpegObjectUrl(blob)
}
