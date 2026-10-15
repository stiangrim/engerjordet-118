import { useMemo, useState } from 'react'
import { CanWrite } from './CanWrite'
import { CostEntryForm } from './CostEntryForm'
import { PaymentToggle, PaymentToggleGroup } from './PaymentToggle'
import { normalizePaymentStatus } from '../lib/paymentStatus'
import { ReceiptFilePicker } from './ReceiptFilePicker'
import { formatNorwegianDate, todayIsoDate } from '../lib/dates'
import { formatSupabaseError } from '../lib/errors'
import { CostLineSummary } from './CostLineSummary'
import {
  costEntryHoursDetail,
  costEntryTitle,
  receiptMetaExtra,
  receiptTitle,
} from '../lib/costLineDisplay'
import { formatNok, parseAmount } from '../lib/money'
import { supabase } from '../lib/supabase'
import {
  createCostEntry,
  createReceipt,
  updateCostEntry,
  updateReceipt,
  uploadReceiptFile,
} from '../lib/project'
import type { CostEntry, Payee, Receipt } from '../lib/types'
import { SearchableSelect } from './SearchableSelect'
import { receiptCostTypeOptions } from '../lib/selectOptions'
import {
  receiptCostTypeLabel,
  DEFAULT_PAYMENT_STATUS,
  type PaymentStatus,
  type ReceiptCostType,
} from '../lib/constants'

type Line =
  | { kind: 'cost'; item: CostEntry }
  | { kind: 'receipt'; item: Receipt }

type Props = {
  projectId: string
  budgetItemId: string
  budgetItems: {
    id: string
    category: string
    post: string
    hourly_rate: number | null
  }[]
  costEntries: CostEntry[]
  receipts: Receipt[]
  payees?: Payee[]
  onChanged: () => void
}

export function BudgetItemActualsPanel({
  projectId,
  budgetItemId,
  budgetItems,
  costEntries,
  receipts,
  payees = [],
  onChanged,
}: Props) {
  const [subView, setSubView] = useState<'list' | 'cost' | 'receipt'>('list')
  const [busyId, setBusyId] = useState<string | null>(null)
  const payeeNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of payees) m.set(p.id, p.name)
    return m
  }, [payees])

  const lines = useMemo(() => {
    const list: Line[] = []
    for (const c of costEntries.filter((e) => e.budget_item_id === budgetItemId)) {
      list.push({ kind: 'cost', item: c })
    }
    for (const r of receipts.filter((r) => r.budget_item_id === budgetItemId)) {
      list.push({ kind: 'receipt', item: r })
    }
    list.sort((a, b) => {
      const da =
        a.kind === 'cost' ? a.item.entry_date : a.item.receipt_date ?? ''
      const db =
        b.kind === 'cost' ? b.item.entry_date : b.item.receipt_date ?? ''
      return db.localeCompare(da)
    })
    return list
  }, [costEntries, receipts, budgetItemId])

  const linesTotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.item.amount),
        0,
      ),
    [lines],
  )

  async function setPayment(line: Line, status: PaymentStatus) {
    const id = line.kind === 'cost' ? line.item.id : line.item.id
    setBusyId(id)
    try {
      if (line.kind === 'cost') {
        await updateCostEntry(line.item.id, { payment_status: status })
      } else {
        await updateReceipt(line.item.id, { payment_status: status })
      }
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  if (subView === 'cost') {
    return (
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          className="text-sm text-slate-600 underline"
          onClick={() => setSubView('list')}
        >
          ← Tilbake
        </button>
        <CostEntryForm
          budgetItems={budgetItems}
          payees={payees}
          fixedBudgetItemId={budgetItemId}
          onCancel={() => setSubView('list')}
          onSave={async (values) => {
            await createCostEntry(projectId, {
              ...values,
              budget_item_id: budgetItemId,
            })
            setSubView('list')
            onChanged()
          }}
        />
      </div>
    )
  }

  if (subView === 'receipt') {
    return (
      <ReceiptQuickForm
        projectId={projectId}
        budgetItemId={budgetItemId}
        onBack={() => setSubView('list')}
        onSaved={() => {
          setSubView('list')
          onChanged()
        }}
      />
    )
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Faktiske kostnader på posten
          </h3>
          <p className="text-xs text-slate-500">
            {lines.length === 0
              ? 'Ingen registreringer knyttet til denne posten.'
              : `${lines.length} registrering${lines.length === 1 ? '' : 'er'} · sum ${formatNok(linesTotal)} (inkl. via mottaker)`}
          </p>
        </div>
        <CanWrite>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
              onClick={() => setSubView('cost')}
            >
              + Timer/kostnad
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
              onClick={() => setSubView('receipt')}
            >
              + Kvittering
            </button>
          </div>
        </CanWrite>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-slate-500">Ingen registreringer ennå.</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => {
            const id = line.item.id
            const amount = Number(line.item.amount)
            const title =
              line.kind === 'receipt'
                ? receiptTitle(line.item)
                : costEntryTitle(line.item)
            const metaExtra =
              line.kind === 'receipt'
                ? receiptMetaExtra(line.item, title)
                : null
            const hoursDetail =
              line.kind === 'cost' ? costEntryHoursDetail(line.item) : null
            const date = formatNorwegianDate(
              line.kind === 'cost'
                ? line.item.entry_date
                : line.item.receipt_date,
            )
            const type =
              line.kind === 'cost' ? line.item.cost_type : line.item.cost_type
            const payment = normalizePaymentStatus(line.item.payment_status)
            const payeeId =
              line.kind === 'cost' ? line.item.payee_id : null
            const payeeName = payeeId ? payeeNameById.get(payeeId) : null

            return (
              <li
                key={`${line.kind}-${id}`}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CostLineSummary
                    dense
                    title={title}
                    amount={amount}
                    dateLabel={date}
                    costType={type}
                    costTypeLabel={receiptCostTypeLabel(type)}
                    recordKind={line.kind}
                    vendorOrExtra={metaExtra}
                    hoursDetail={hoursDetail}
                    payeeName={
                      payeeName ? `Mottaker: ${payeeName}` : null
                    }
                    footer={
                      payeeName ? (
                        <p className="text-xs font-medium text-slate-600">
                          {payeeName} · betaling føres på mottakeren, posten
                          telles fortsatt i faktisk
                        </p>
                      ) : (
                        <PaymentToggle
                          value={payment}
                          disabled={busyId === id}
                          onChange={(s) => void setPayment(line, s)}
                        />
                      )
                    }
                  />
                </div>
                {busyId === id ? (
                  <p className="mt-1 text-slate-400">Lagrer …</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ReceiptQuickForm({
  projectId,
  budgetItemId,
  onBack,
  onSaved,
}: {
  projectId: string
  budgetItemId: string
  onBack: () => void
  onSaved: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [vendor, setVendor] = useState('')
  const [receiptDate, setReceiptDate] = useState(todayIsoDate)
  const [amount, setAmount] = useState('')
  const [costType, setCostType] = useState<ReceiptCostType>('materials')
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>(DEFAULT_PAYMENT_STATUS)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Velg fil.')
      return
    }
    const parsed = parseAmount(amount)
    if (parsed <= 0) {
      setError('Angi beløp.')
      return
    }
    setBusy(true)
    setError(null)
    let storagePath: string | null = null
    try {
      storagePath = await uploadReceiptFile(projectId, file)
      await createReceipt({
        project_id: projectId,
        budget_item_id: budgetItemId,
        payee_id: null,
        vendor: vendor.trim(),
        receipt_date: receiptDate || null,
        amount: parsed,
        vat_amount: null,
        cost_type: costType,
        description: description.trim(),
        storage_path: storagePath,
        payment_status: paymentStatus,
      })
      onSaved()
    } catch (err) {
      if (storagePath) {
        await supabase.storage.from('receipts').remove([storagePath])
      }
      setError(formatSupabaseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-3 border-t border-slate-200 pt-4 text-sm"
    >
      <button
        type="button"
        className="text-slate-600 underline"
        onClick={onBack}
      >
        ← Tilbake
      </button>
      <ReceiptFilePicker file={file} onFileChange={setFile} disabled={busy} />
      <input className="input" placeholder="Leverandør" value={vendor} onChange={(e) => setVendor(e.target.value)} />
      <input
        type="date"
        className="input"
        value={receiptDate}
        onChange={(e) => setReceiptDate(e.target.value)}
        disabled={busy}
      />
      <input
        className="input"
        placeholder="Beløp inkl. mva"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <SearchableSelect
        value={costType}
        onChange={(v) => setCostType(v as ReceiptCostType)}
        options={receiptCostTypeOptions()}
        searchPlaceholder="Søk type …"
      />
      <label className="block">
        <span className="mb-1 block font-medium">Betaling</span>
        <PaymentToggleGroup value={paymentStatus} onChange={setPaymentStatus} />
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Beskrivelse / notat</span>
        <textarea
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="F.eks. hva du kjøpte, rom/prosjekt, ordrenummer …"
        />
      </label>
      {error ? <p className="text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Lagrer …' : 'Lagre kvittering'}
      </button>
    </form>
  )
}
