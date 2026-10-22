import heic2any from 'heic2any'
import { isVideoUploadFile } from './projectMedia'
import { isHeicLike } from './receiptPreview'

const THUMB_MAX_EDGE = 720
const THUMB_JPEG_QUALITY = 0.82

/** JPEG-miniatyr / videoposter for rask gallerivisning. */
export async function createPhotoThumbnail(file: File): Promise<Blob | null> {
  if (isVideoUploadFile(file)) {
    return createVideoPoster(file)
  }
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

function createVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadeddata = () => {
      const t = Number.isFinite(video.duration)
        ? Math.min(1, Math.max(0.1, video.duration * 0.05))
        : 0.1
      video.currentTime = t
    }

    video.onseeked = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (w <= 0 || h <= 0) {
        cleanup()
        resolve(null)
        return
      }
      const scale = Math.min(1, THUMB_MAX_EDGE / Math.max(w, h))
      const cw = Math.max(1, Math.round(w * scale))
      const ch = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        resolve(null)
        return
      }
      ctx.drawImage(video, 0, 0, cw, ch)
      canvas.toBlob(
        (blob) => {
          cleanup()
          resolve(blob)
        },
        'image/jpeg',
        THUMB_JPEG_QUALITY,
      )
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    video.src = url
  })
}
