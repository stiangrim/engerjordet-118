import { useCanWrite } from '../access/AccessContext'

type Props = {
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  busy?: boolean
  saveLabel?: string
}

export function FormActions({
  onSave,
  onCancel,
  onDelete,
  busy,
  saveLabel = 'Lagre',
}: Props) {
  const canWrite = useCanWrite()

  if (!canWrite) {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Lukk
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? 'Lagrer …' : saveLabel}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        Avbryt
      </button>
      {onDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm('Slette?')) void onDelete()
          }}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Slett
        </button>
      ) : null}
    </div>
  )
}
