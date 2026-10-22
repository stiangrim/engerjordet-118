import { useEffect, useRef, useState } from 'react'
import { photoGridDisplayUrl } from '../lib/photoGridDisplayUrl'
import type { ProjectPhoto } from '../lib/types'

export function usePhotoGridDisplayUrl(photo: ProjectPhoto): {
  setRootElement: (node: HTMLDivElement | null) => void
  url: string | null
  loading: boolean
  retry: () => void
} {
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!rootElement) return

    let cancelled = false
    let started = false

    const startLoad = () => {
      if (started || cancelled) return
      started = true
      setLoading(true)
      void photoGridDisplayUrl(photo).then((next) => {
        if (cancelled) {
          if (next?.startsWith('blob:')) URL.revokeObjectURL(next)
          return
        }
        if (blobUrlRef.current?.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrlRef.current)
        }
        blobUrlRef.current = next?.startsWith('blob:') ? next : null
        setUrl(next)
        setLoading(false)
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) startLoad()
      },
      { rootMargin: '240px' },
    )
    observer.observe(rootElement)

    return () => {
      cancelled = true
      observer.disconnect()
      if (blobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [rootElement, photo.id, photo.thumb_path, photo.storage_path, retryKey])

  return {
    setRootElement,
    url,
    loading,
    retry: () => {
      setUrl(null)
      setRetryKey((k) => k + 1)
    },
  }
}
