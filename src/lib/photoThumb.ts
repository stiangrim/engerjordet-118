import heic2any from 'heic2any'
import { isHeicLike } from './receiptPreview'

const THUMB_MAX_EDGE = 720
const THUMB_JPEG_QUALITY = 0.82

/** JPEG-miniatyr for rask gallerivisning (inkl. HEIC-kilder). */
export async function createPhotoThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/') && !isHeicLike(file)) {
    return null
  }

  let sourceBlob: Blob = file
  if (isHeicLike(file)) {
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: THUMB_JPEG_QUALITY,
    })
    sourceBlob = Array.isArray(converted) ? converted[0] : converted
  }

  return resizeBlobToJpeg(sourceBlob, THUMB_MAX_EDGE)
}

function resizeBlobToJpeg(blob: Blob, maxEdge: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale = Math.min(1, maxEdge / Math.max(width, height))
      const w = Math.max(1, Math.round(width * scale))
      const h = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas ikke tilgjengelig'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (out) => {
          if (out) resolve(out)
          else reject(new Error('Kunne ikke lage miniatyr'))
        },
        'image/jpeg',
        THUMB_JPEG_QUALITY,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Kunne ikke lese bilde'))
    }
    img.src = url
  })
}
