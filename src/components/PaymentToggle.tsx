import { useCanWrite } from '../access/AccessContext'
import { PAYMENT_STATUSES, type PaymentStatus } from '../lib/constants'
import {
  normalizePaymentStatus,
  paymentStatusBadgeClass,
} from '../lib/paymentStatus'

/** Klikk for å veksle Betalt ↔ Ikke betalt */
type ToggleProps = {
  value: string
  onChange: (value: PaymentStatus) => void
  disabled?: boolean
}

export function PaymentToggle({ value, onChange, disabled }: ToggleProps) {
  const canWrite = useCanWrite()
  const status = normalizePaymentStatus(value)

  return (
    <button
      type="button"
      disabled={disabled || !canWrite}
      onClick={(e) => {
        e.stopPropagation()
        onChange(status === 'Betalt' ? 'Ikke betalt' : 'Betalt')
      }}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-50 ${paymentStatusBadgeClass(status)}`}
      title="Klikk for å endre betaling"
    >
      {status}
    </button>
  )
}

/** To knapper ved registrering */
type GroupProps = {
  value: PaymentStatus
  onChange: (value: PaymentStatus) => void
}

export function PaymentToggleGroup({ value, onChange }: GroupProps) {
  const canWrite = useCanWrite()
  const status = normalizePaymentStatus(value)

  return (
    <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
      {PAYMENT_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={!canWrite}
          onClick={() => onChange(s)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            status === s
              ? s === 'Betalt'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
