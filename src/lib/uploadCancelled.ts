export class UploadCancelledError extends Error {
  override name = 'UploadCancelledError'

  constructor(message = 'Opplasting avbrutt') {
    super(message)
  }
}

export function throwIfCancelled(isCancelled?: () => boolean): void {
  if (isCancelled?.()) {
    throw new UploadCancelledError()
  }
}
