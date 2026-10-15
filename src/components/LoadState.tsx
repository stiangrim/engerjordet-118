import type { ReactNode } from 'react'

type Props = {
  loading: boolean
  error: string | null
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
}

export function LoadState({
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: Props) {
  if (loading) {
    return (
      <p className="text-sm text-slate-500" role="status">
        Laster …
      </p>
    )
  }
  if (error) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        role="alert"
      >
        {error}
      </div>
    )
  }
  if (empty) {
    return (
      <p className="text-sm text-slate-500">{emptyMessage ?? 'Ingen data.'}</p>
    )
  }
  return children
}
