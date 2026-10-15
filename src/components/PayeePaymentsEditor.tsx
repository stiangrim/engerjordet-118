import { useState } from 'react'
import { PAYEE_PAYMENT_METHODS, type PayeePaymentMethod } from '../lib/constants'
import { formatNorwegianDate, todayIsoDate } from '../lib/dates'
import { formatNok, parseAmount } from '../lib/money'
import {
  createPayeePayment,
  deletePayeePayment,
} from '../lib/project'
import type { PayeePayment } from '../lib/types'
import { SearchableSelect } from './SearchableSelect'
import { MetaLine } from './MetaLine'
import { CalendarIcon, TagIcon } from './icons'

type Props = {
  payeeId: string
  payments: PayeePayment[]
  onChanged: () => void
  compact?: boolean
}

export function PayeePaymentsEditor({
  payeeId,
  payments,
  onChanged,
  compact,
}: Props) {
  const [amount, setAmount] = useState('')
  const [methodChoice, setMethodChoice] = useState<PayeePaymentMethod>('Vipps')
  const [customMethod, setCustomMethod] = useState('')
  const [note, setNote] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayIsoDate())
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function resolvedMethod(): string {
    if (methodChoice === 'Annet') {
      const custom = customMethod.trim()
      return custom || 'Annet'
    }
    return methodChoice
  }

  async function addPayment() {
    const value = parseAmount(amount)
    if (value <= 0) return
    setBusy(true)
    try {
      await createPayeePayment({
        payee_id: payeeId,
        payment_date: paymentDate,
        amount: value,
        method: resolvedMethod(),
        note: note.trim(),
      })
      setAmount('')
      setNote('')
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function removePayment(id: string) {
    setDeletingId(id)
    try {
      await deletePayeePayment(id)
      onChanged()
    } finally {
      setDeletingId(null)
    }
  }

  const heading = compact ? 'text-sm' : 'text-base'

  return (
    <div className="space-y-3">
      <div>
        <h4 className={`font-medium text-slate-900 ${heading}`}>
          Innbetalinger
        </h4>
        <p className="mt-0.5 text-xs text-slate-500">
          Hver post telles mot «betalt totalt». Legg til Vipps, kontant osv. når
          du betaler.
        </p>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen innbetalinger registrert.</p>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-semibold tabular-nums text-slate-900">
                  {formatNok(Number(p.amount))}
                </p>
                <MetaLine icon={CalendarIcon} className="text-xs">
                  {formatNorwegianDate(p.payment_date)}
                </MetaLine>
                <MetaLine icon={TagIcon} className="text-xs">
                  {p.method.trim() || 'Ukjent'}
                </MetaLine>
                {p.note.trim() ? (
                  <p className="text-xs text-slate-600">{p.note}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={deletingId === p.id}
                onClick={() => void removePayment(p.id)}
                className="shrink-0 text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
              >
                {deletingId === p.id ? '…' : 'Slett'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-3">
        <p className="text-sm font-medium text-slate-800">Ny innbetaling</p>
        <label className="block text-sm">
          <span className="font-medium">Dato</span>
          <input
            type="date"
            className="input mt-1"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Beløp (kr)</span>
          <input
            className="input mt-1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="F.eks. 25 000"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Betalt med</span>
          <div className="mt-1">
            <SearchableSelect
              value={methodChoice}
              onChange={(v) => setMethodChoice(v as PayeePaymentMethod)}
              options={PAYEE_PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
              searchPlaceholder="Søk …"
            />
          </div>
        </label>
        {methodChoice === 'Annet' ? (
          <label className="block text-sm">
            <span className="font-medium">Beskriv</span>
            <input
              className="input mt-1"
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              placeholder="F.eks. Swish, gavekort …"
            />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="font-medium">Notat</span>
          <input
            className="input mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Valgfritt"
          />
        </label>
        <button
          type="button"
          disabled={busy || !amount.trim()}
          onClick={() => void addPayment()}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? 'Lagrer …' : 'Legg til innbetaling'}
        </button>
      </div>
    </div>
  )
}
