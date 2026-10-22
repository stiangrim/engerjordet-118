import { UploadCancelledError } from './uploadCancelled'

/** Kjør async jobber med begrenset parallellitet (bulk-opplasting). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  options?: { isCancelled?: () => boolean },
): Promise<R[]> {
  if (items.length === 0) return []
  const limit = Math.max(1, concurrency)
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    for (;;) {
      if (options?.isCancelled?.()) {
        throw new UploadCancelledError()
      }
      const i = nextIndex
      nextIndex += 1
      if (i >= items.length) return
      if (options?.isCancelled?.()) {
        throw new UploadCancelledError()
      }
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}
