import { PROJECT_PHOTOS_BUCKET } from './project'
import { projectPhotoMediaKind } from './projectMedia'
import { isHeicLike, previewObjectUrlForRemote } from './receiptPreview'
import {
  getSignedStorageUrl,
  invalidateSignedStorageUrl,
} from './signedUrlQueue'
import type { ProjectPhoto } from './types'

async function imageUrlReachable(url: string): Promise<boolean> {
  if (url.startsWith('blob:')) return true
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1023' },
    })
    return res.ok || res.status === 206
  } catch {
    return false
  }
}

async function displayUrlForStoragePath(path: string): Promise<string | null> {
  const signed = await getSignedStorageUrl(PROJECT_PHOTOS_BUCKET, path)
  if (!signed) return null

  const fileName = path.split('/').pop() ?? ''
  if (isHeicLike(fileName)) {
    try {
      const blobUrl = await previewObjectUrlForRemote(signed, fileName)
      return blobUrl
    } catch {
      invalidateSignedStorageUrl(PROJECT_PHOTOS_BUCKET, path)
      return null
    }
  }

  if (await imageUrlReachable(signed)) {
    return signed
  }

  invalidateSignedStorageUrl(PROJECT_PHOTOS_BUCKET, path)
  return null
}

/** URL for rutenett — prøver miniatyr, deretter original. */
export async function photoGridDisplayUrl(
  photo: ProjectPhoto,
): Promise<string | null> {
  const isVideo = projectPhotoMediaKind(photo) === 'video'
  const paths: string[] = []
  if (photo.thumb_path) paths.push(photo.thumb_path)
  if (!isVideo) paths.push(photo.storage_path)

  for (const path of paths) {
    const url = await displayUrlForStoragePath(path)
    if (url) return url
  }

  return null
}

export function invalidatePhotoGridUrls(photo: ProjectPhoto): void {
  if (photo.thumb_path) {
    invalidateSignedStorageUrl(PROJECT_PHOTOS_BUCKET, photo.thumb_path)
  }
  invalidateSignedStorageUrl(PROJECT_PHOTOS_BUCKET, photo.storage_path)
}
