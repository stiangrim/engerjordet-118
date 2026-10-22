import { signedStorageUrl } from './project'

type CacheEntry = { url: string; expiresAt: number }

const cache = new Map<string, CacheEntry>()
const TTL_MS = 50 * 60 * 1000
const MAX_CONCURRENT = 6

let active = 0
const waiters: Array<() => void> = []

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function runNext(): void {
  if (active >= MAX_CONCURRENT || waiters.length === 0) return
  const next = waiters.shift()
  next?.()
}

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve))
  }
  active += 1
  try {
    return await fn()
  } finally {
    active -= 1
    runNext()
  }
}

/** Begrenset parallellitet, cache og retry — unngår at galleri flommer Supabase. */
export async function getSignedStorageUrl(
  bucket: string,
  path: string,
): Promise<string | null> {
  const key = cacheKey(bucket, path)
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.url
  }

  return withSlot(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const url = await signedStorageUrl(bucket, path)
      if (url) {
        cache.set(key, { url, expiresAt: Date.now() + TTL_MS })
        return url
      }
      if (attempt < 2) await sleep(400 * (attempt + 1))
    }
    return null
  })
}
