import { PROJECT_PHOTOS_BUCKET } from './project'
import { projectPhotoMediaKind } from './projectMedia'
import { isHeicLike, previewObjectUrlForRemote } from './receiptPreview'
import { getSignedStorageUrl } from './signedUrlQueue'
import type { ProjectPhoto } from './types'

/** URL for rutenett (miniatyr, eller konvertert HEIC). */
export async function photoGridDisplayUrl(
  photo: ProjectPhoto,
): Promise<string | null> {
  const isVideo = projectPhotoMediaKind(photo) === 'video'

  if (photo.thumb_path) {
    return getSignedStorageUrl(PROJECT_PHOTOS_BUCKET, photo.thumb_path)
  }

  if (isVideo) return null

  const signed = await getSignedStorageUrl(
    PROJECT_PHOTOS_BUCKET,
    photo.storage_path,
  )
  if (!signed) return null

  const fileName = photo.storage_path.split('/').pop() ?? ''
  if (isHeicLike(fileName)) {
    try {
      return await previewObjectUrlForRemote(signed, fileName)
    } catch {
      return null
    }
  }

  return signed
}
