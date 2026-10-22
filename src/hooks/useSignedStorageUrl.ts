import { useEffect, useState } from 'react'
import { getSignedStorageUrl } from '../lib/signedUrlQueue'

export function useSignedStorageUrl(
  bucket: string,
  path: string | null | undefined,
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))

  useEffect(() => {
    if (!path) {
      setUrl(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void getSignedStorageUrl(bucket, path).then((signed) => {
      if (cancelled) return
      setUrl(signed)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [bucket, path])

  return { url, loading }
}
