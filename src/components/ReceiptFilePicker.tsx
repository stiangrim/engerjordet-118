import { useId, useRef, useState } from 'react'
import { isHeicLike, isPdfLike } from '../lib/receiptPreview'
import { LocalReceiptPreview } from './LocalReceiptPreview'

type Props = {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

export function ReceiptFilePicker({ file, onFileChange, disabled }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function pick(selected: File | null) {
    onFileChange(selected)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    pick(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) pick(dropped)
  }

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700">
        Kvittering (bilde eller PDF)
      </span>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*,.heic,.heif,application/pdf"
        capture="environment"
        disabled={disabled}
        className="sr-only"
        onChange={onInputChange}
      />

      {!file ? (
        <div
          onDragEnter={(e) => {
            e.preventDefault()
            if (!disabled) setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver
              ? 'border-slate-500 bg-slate-100'
              : 'border-slate-300 bg-slate-50/80'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          <p className="text-sm font-medium text-slate-800">
            Dra fil hit, eller velg fra enheten
          </p>
          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG, HEIC eller PDF · beløp er inkl. mva
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Velg fil
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Valgt fil
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-900">
                {file.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {(file.size / 1024).toFixed(0)} KB
                {isPdfLike(file)
                  ? ' · PDF'
                  : isHeicLike(file)
                    ? ' · HEIC'
                    : ' · bilde'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Bytt fil
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFileChange(null)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                Fjern
              </button>
            </div>
          </div>

          <LocalReceiptPreview file={file} />
        </div>
      )}
    </div>
  )
}
