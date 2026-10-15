import { useEffect, useState } from 'react'
import { downloadFileFromUrl, downloadLocalFile } from '../lib/fileDownload'
import { PROJECT_ATTACHMENTS_BUCKET, signedReceiptUrl, signedStorageUrl } from '../lib/project'
import {
  canPreviewReceiptFile,
  isHeicLike,
  isPdfLike,
  previewObjectUrlForFile,
  previewObjectUrlForRemote,
} from '../lib/receiptPreview'

function useLocalPreviewUrl(file: File | null): {
  url: string | null
  loading: boolean
  error: string | null
} {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setUrl(null)
      setError(null)
      setLoading(false)
      return
    }
    let objectUrl: string | null = null
    let cancelled = false
    setLoading(true)
    setError(null)
    setUrl(null)

    void previewObjectUrlForFile(file)
      .then((u) => {
        if (cancelled) {
          if (u.startsWith('blob:')) URL.revokeObjectURL(u)
          return
        }
        objectUrl = u
        setUrl(u)
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            isHeicLike(file)
              ? 'Kunne ikke vise HEIC. Filen kan fortsatt lastes opp – prøv «Vis fil» etter lagring, eller ta bilde som JPG.'
              : 'Kunne ikke vise forhåndsvisning.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [file])

  return { url, loading, error }
}

function pdfViewerUrl(url: string): string {
  const hash = 'toolbar=0&navpanes=0'
  return url.includes('#') ? url : `${url}#${hash}`
}

export type FileDownloadSource =
  | { kind: 'url'; url: string; fileName: string }
  | { kind: 'file'; file: File }

async function runDownload(source: FileDownloadSource): Promise<void> {
  if (source.kind === 'file') {
    downloadLocalFile(source.file)
    return
  }
  await downloadFileFromUrl(source.url, source.fileName)
}

function DownloadFileButton({
  source,
  className,
}: {
  source: FileDownloadSource
  className?: string
}) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void runDownload(source)
          .catch(() => {
            if (source.kind === 'url') {
              window.open(source.url, '_blank', 'noopener,noreferrer')
            }
          })
          .finally(() => setBusy(false))
      }}
      className={
        className ??
        'shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50'
      }
    >
      {busy ? 'Laster …' : 'Last ned'}
    </button>
  )
}

type PreviewFrameProps = {
  url: string
  isPdf: boolean
  fileName: string
  imgClassName?: string
  iframeClassName?: string
}

function PreviewFrame({
  url,
  isPdf,
  fileName,
  imgClassName,
  iframeClassName,
}: PreviewFrameProps) {
  if (isPdf) {
    return (
      <iframe
        src={pdfViewerUrl(url)}
        title={fileName}
        className={
          iframeClassName ??
          'h-full w-full rounded-lg border border-slate-200 bg-white'
        }
      />
    )
  }
  return (
    <img
      src={url}
      alt={`Forhåndsvisning: ${fileName}`}
      className={
        imgClassName ??
        'max-h-full max-w-full rounded-lg border border-slate-200 object-contain'
      }
    />
  )
}

function FullscreenPreview({
  url,
  isPdf,
  fileName,
  download,
  onClose,
}: {
  url: string
  isPdf: boolean
  fileName: string
  download: FileDownloadSource
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-slate-950/90 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Forstørret kvittering"
      onClick={onClose}
    >
      <div
        className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="truncate text-sm font-medium text-white">{fileName}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            Ny fane
          </button>
          <DownloadFileButton
            source={download}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
          />
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
            onClick={onClose}
          >
            Lukk
          </button>
        </div>
      </div>
      <div
        className={`relative min-h-0 flex-1 ${isPdf ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <PreviewFrame
          url={url}
          isPdf={isPdf}
          fileName={fileName}
          imgClassName="mx-auto max-h-[calc(100vh-6rem)] max-w-full object-contain"
          iframeClassName="h-[calc(100vh-6rem)] w-full rounded-lg bg-white"
        />
      </div>
    </div>
  )
}

export function ExpandableReceiptPreview({
  url,
  fileName,
  isPdf,
  className,
  download,
}: {
  url: string
  fileName: string
  isPdf: boolean
  className?: string
  download: FileDownloadSource
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className ?? ''}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <span className="min-w-0 truncate text-xs text-slate-600">{fileName}</span>
          <div className="flex shrink-0 gap-1.5">
            <DownloadFileButton source={download} />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Forstørre
            </button>
          </div>
        </div>
        {isPdf ? (
          <iframe
            src={pdfViewerUrl(url)}
            title={fileName}
            className="block h-52 w-full bg-white"
          />
        ) : (
          <div className="max-h-52 overflow-auto bg-slate-50 p-1">
            <PreviewFrame
              url={url}
              isPdf={false}
              fileName={fileName}
              imgClassName="mx-auto max-h-52 w-full object-contain"
            />
          </div>
        )}
        {isPdf ? (
          <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">
            Scroll inne i rammen for å lese hele kvitteringen
          </p>
        ) : null}
      </div>

      {expanded ? (
        <FullscreenPreview
          url={url}
          isPdf={isPdf}
          fileName={fileName}
          download={download}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </>
  )
}

export function LocalReceiptPreview({ file }: { file: File }) {
  const { url, loading, error } = useLocalPreviewUrl(file)
  const isPdf = isPdfLike(file)

  if (!canPreviewReceiptFile(file)) return null

  if (loading) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        {isHeicLike(file)
          ? 'Konverterer HEIC for forhåndsvisning …'
          : 'Laster forhåndsvisning …'}
      </p>
    )
  }

  if (error) {
    return <p className="mt-3 text-sm text-amber-800">{error}</p>
  }

  if (!url) return null

  return (
    <ExpandableReceiptPreview
      url={url}
      fileName={file.name}
      isPdf={isPdf}
      className="mt-3"
      download={{ kind: 'file', file }}
    />
  )
}

export function StoredFilePreview({
  storagePath,
  bucket = 'receipts',
  emptyLabel = 'fil',
}: {
  storagePath: string
  bucket?: string
  emptyLabel?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileName = storagePath.split('/').pop() ?? emptyLabel
  const isPdf = isPdfLike(fileName)
  const isHeic = isHeicLike(fileName)

  useEffect(() => {
    let cancelled = false
    let blobUrl: string | null = null
    setFailed(false)
    setUrl(null)
    setDownloadUrl(null)
    setLoading(true)

    void (async () => {
      const signed =
        bucket === 'receipts'
          ? await signedReceiptUrl(storagePath)
          : await signedStorageUrl(bucket, storagePath)
      if (cancelled) return
      if (!signed) {
        setFailed(true)
        setLoading(false)
        return
      }
      setDownloadUrl(signed)
      try {
        const previewUrl = await previewObjectUrlForRemote(signed, fileName)
        if (cancelled) {
          if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
          return
        }
        blobUrl = previewUrl.startsWith('blob:') ? previewUrl : null
        setUrl(previewUrl)
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [storagePath, fileName, bucket])

  if (failed) {
    return (
      <p className="text-sm text-slate-500">
        Kunne ikke laste forhåndsvisning.
      </p>
    )
  }
  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        {isHeic
          ? 'Konverterer HEIC for forhåndsvisning …'
          : 'Laster forhåndsvisning …'}
      </p>
    )
  }
  if (!url || !downloadUrl) return null

  return (
    <ExpandableReceiptPreview
      url={url}
      fileName={fileName}
      isPdf={isPdf}
      download={{ kind: 'url', url: downloadUrl, fileName }}
    />
  )
}

export function StoredReceiptPreview({
  storagePath,
}: {
  storagePath: string
}) {
  return <StoredFilePreview storagePath={storagePath} bucket="receipts" emptyLabel="kvittering" />
}

export function StoredProjectAttachmentPreview({
  storagePath,
}: {
  storagePath: string
}) {
  return (
    <StoredFilePreview
      storagePath={storagePath}
      bucket={PROJECT_ATTACHMENTS_BUCKET}
      emptyLabel="vedlegg"
    />
  )
}
