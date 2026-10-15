export function itemStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Pågår':
      return 'bg-sky-50 text-sky-800 ring-sky-200'
    case 'Ferdig':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'Avvik':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'Ikke startet':
      return 'bg-slate-100 text-slate-600 ring-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

type Props = {
  status: string
  className?: string
}

export function StatusBadge({ status, className = '' }: Props) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${itemStatusBadgeClass(status)} ${className}`}
    >
      {status}
    </span>
  )
}
