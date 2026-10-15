import { useMemo, useState } from 'react'
import { parseAmount, formatNok } from '../lib/money'
import type { CostEntry, Payee } from '../lib/types'
import type { CostEntryWrite } from '../lib/project'
import { todayIsoDate } from '../lib/dates'
import { FormActions } from './FormActions'
import { SearchableSelect } from './SearchableSelect'
import {
  BudgetItemCategoryHint,
  BudgetItemSummaryLine,
} from './BudgetItemSummaryLine'
import {
  budgetItemOptions,
  payeeOptions,
  receiptCostTypeOptions,
} from '../lib/selectOptions'
import { PaymentToggleGroup } from './PaymentToggle'
import { normalizePaymentStatus } from '../lib/paymentStatus'
import {
  DEFAULT_PAYMENT_STATUS,
  normalizeReceiptCostType,
  type PaymentStatus,
  type ReceiptCostType,
} from '../lib/constants'
import { isWorkerCostType } from '../lib/paymentSummary'

type Props = {
  budgetItems: {
    id: string
    category: string
    post: string
    description?: string | null
    hourly_rate: number | null
  }[]
  payees?: Payee[]
  initial?: CostEntry
  fixedBudgetItemId?: string
  onSave: (values: CostEntryWrite) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function CostEntryForm({
  budgetItems,
  payees = [],
  initial,
  fixedBudgetItemId,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<'hours' | 'amount'>(
    initial?.hours != null ? 'hours' : initial ? 'amount' : 'hours',
  )
  const [entryDate, setEntryDate] = useState(
    initial?.entry_date ?? todayIsoDate(),
  )
  const [budgetItemId, setBudgetItemId] = useState(
    fixedBudgetItemId ?? initial?.budget_item_id ?? '',
  )
  const [costType, setCostType] = useState<ReceiptCostType>(
    initial ? normalizeReceiptCostType(initial.cost_type) : 'subcontractor',
  )
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(() => {
    if (initial?.payment_status != null) {
      return normalizePaymentStatus(initial.payment_status)
    }
    const type = initial
      ? normalizeReceiptCostType(initial.cost_type)
      : 'subcontractor'
    return isWorkerCostType(type) ? 'Ikke betalt' : DEFAULT_PAYMENT_STATUS
  })
  const [hours, setHours] = useState(
    initial?.hours != null ? String(initial.hours) : '',
  )
  const [hourlyRate, setHourlyRate] = useState(
    initial?.hourly_rate != null
      ? String(initial.hourly_rate)
      : '450',
  )
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [payeeId, setPayeeId] = useState(
    initial?.payee_id ??
      (payees.length === 1 && !initial ? payees[0].id : ''),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = budgetItems.find((b) => b.id === budgetItemId)

  const computedFromHours = useMemo(() => {
    const h = parseAmount(hours)
    const r = parseAmount(hourlyRate)
    if (h <= 0 || r <= 0) return 0
    return h * r
  }, [hours, hourlyRate])

  function applyItemRate(itemId: string) {
    setBudgetItemId(itemId)
    const item = budgetItems.find((b) => b.id === itemId)
    if (item?.hourly_rate != null) {
      setHourlyRate(String(item.hourly_rate))
    }
  }

  async function handleSave() {
    if (!budgetItemId) {
      setError('Velg budsjettpost.')
      return
    }
    const finalAmount =
      mode === 'hours' ? computedFromHours : parseAmount(amount)
    if (finalAmount <= 0) {
      setError('Beløp må være større enn null.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave({
        budget_item_id: budgetItemId,
        payee_id: payeeId || null,
        entry_date: entryDate,
        cost_type: costType,
        amount: finalAmount,
        hours: mode === 'hours' ? parseAmount(hours) : null,
        hourly_rate: mode === 'hours' ? parseAmount(hourlyRate) : null,
        description: description.trim(),
        payment_status: payeeId ? 'Betalt' : paymentStatus,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lagre')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setBusy(true)
    try {
      await onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke slette')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
            mode === 'hours' ? 'bg-white shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => {
            setMode('hours')
            setCostType('subcontractor')
          }}
        >
          Timer × sats
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
            mode === 'amount' ? 'bg-white shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => setMode('amount')}
        >
          Beløp direkte
        </button>
      </div>

      <label className="block">
        <span className="font-medium">Dato</span>
        <input
          type="date"
          className="input mt-1"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
      </label>

      {fixedBudgetItemId ? (
        selectedItem ? (
          <BudgetItemSummaryLine item={selectedItem} boxed />
        ) : null
      ) : (
        <label className="block">
          <span className="font-medium">Budsjettpost</span>
          <div className="mt-1">
            <SearchableSelect
              value={budgetItemId}
              onChange={(id) => applyItemRate(id)}
              options={budgetItemOptions(budgetItems)}
              allowEmpty
              emptyLabel="— Velg post —"
              searchPlaceholder="Søk budsjettpost …"
            />
          </div>
          <BudgetItemCategoryHint item={selectedItem} />
        </label>
      )}

      {payees.length > 0 ? (
        <label className="block">
          <span className="font-medium">Mottaker (hvem du skylder)</span>
          <div className="mt-1">
            <SearchableSelect
              value={payeeId}
              onChange={setPayeeId}
              options={payeeOptions(payees)}
              allowEmpty
              emptyLabel="— Ingen / betaling per post —"
              searchPlaceholder="Søk mottaker …"
            />
          </div>
          {payeeId ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Betaling føres samlet på mottakeren (innbetalinger). Kostnaden
              vises fortsatt på valgt budsjettpost.
            </p>
          ) : null}
        </label>
      ) : null}

      {!payeeId ? (
        <label className="block">
          <span className="mb-1 block font-medium">Betaling</span>
          <PaymentToggleGroup value={paymentStatus} onChange={setPaymentStatus} />
          {isWorkerCostType(costType) ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Velg en mottaker over for samlet oppfølging (anbefalt for
              håndverkere).
            </p>
          ) : null}
        </label>
      ) : null}

      <label className="block">
        <span className="font-medium">Type kostnad</span>
        <div className="mt-1">
          <SearchableSelect
            value={costType}
            onChange={(v) => setCostType(v as ReceiptCostType)}
            options={receiptCostTypeOptions()}
            searchPlaceholder="Søk type …"
          />
        </div>
      </label>

      {mode === 'hours' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-medium">Timer (mannskap)</span>
            <input
              className="input mt-1"
              inputMode="decimal"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-medium">Timesats (kr)</span>
            <input
              className="input mt-1"
              inputMode="decimal"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </label>
          <p className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
            Beregnet kostnad:{' '}
            <span className="font-semibold tabular-nums">
              {formatNok(computedFromHours)}
            </span>
          </p>
        </div>
      ) : (
        <label className="block">
          <span className="font-medium">Beløp (kr)</span>
          <input
            className="input mt-1"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      )}

      <label className="block">
        <span className="font-medium">Beskrivelse</span>
        <textarea
          className="input mt-1"
          rows={3}
          placeholder="F.eks. Mannskap riving, nesten ferdig …"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error ? <p className="text-red-600">{error}</p> : null}

      <FormActions
        busy={busy}
        onSave={() => void handleSave()}
        onCancel={onCancel}
        onDelete={onDelete ? () => void handleDelete() : undefined}
      />
    </div>
  )
}
