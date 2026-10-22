import { mapWithConcurrency } from './asyncPool'
import { isVideoUploadFile } from './projectMedia'
import { uploadProjectPhotoFile } from './uploadProjectPhoto'
import { UploadCancelledError, throwIfCancelled } from './uploadCancelled'

export type BulkPhotoUploadProgress = {
  total: number
  completed: number
  succeeded: number
  failed: number
  inFlight: string[]
  lastError: string | null
}

export type BulkPhotoUploadResult = {
  succeeded: number
  failed: string[]
  cancelled: boolean
}

function concurrencyFor(files: File[]): number {
  const videos = files.filter(isVideoUploadFile).length
  if (videos > files.length / 2) return 2
  return 4
}

export async function runBulkPhotoUpload(params: {
  projectId: string
  files: File[]
  isCancelled: () => boolean
  onProgress: (progress: BulkPhotoUploadProgress) => void
}): Promise<BulkPhotoUploadResult> {
  const { projectId, files, isCancelled, onProgress } = params
  const failed: string[] = []
  let succeeded = 0
  const inFlight = new Set<string>()

  const report = (completed: number, lastError: string | null = null) => {
    onProgress({
      total: files.length,
      completed,
      succeeded,
      failed: failed.length,
      inFlight: [...inFlight],
      lastError,
    })
  }

  report(0)

  try {
    await mapWithConcurrency(
      files,
      concurrencyFor(files),
      async (file) => {
        throwIfCancelled(isCancelled)
        inFlight.add(file.name)
        report(succeeded + failed.length)
        try {
          await uploadProjectPhotoFile(projectId, file, isCancelled)
          succeeded += 1
        } catch (e) {
          if (e instanceof UploadCancelledError) throw e
          failed.push(file.name)
        } finally {
          inFlight.delete(file.name)
          report(succeeded + failed.length)
        }
      },
      { isCancelled },
    )
  } catch (e) {
    if (e instanceof UploadCancelledError) {
      return { succeeded, failed, cancelled: true }
    }
    throw e
  }

  return { succeeded, failed, cancelled: isCancelled() }
}
