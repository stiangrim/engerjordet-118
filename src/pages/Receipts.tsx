import { useMemo, useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { CanWrite } from '../components/CanWrite'
import { LoadState } from '../components/LoadState'
import { useProjectData } from '../hooks/useProjectData'
import { formatNok, parseAmount } from '../lib/money'
import {
  createCostEntry,
  createReceipt,
  deleteCostEntry,
  deleteReceipt,
  signedReceiptUrl,
  updateCostEntry,
  updateReceipt,
  uploadReceiptFile,
} from '../lib/project'
import { StoredReceiptPreview } from '../components/LocalReceiptPreview'
import { ReceiptFilePicker } from '../components/ReceiptFilePicker'
import {
  formatNorwegianDate,
  formatNorwegianDateMedium,
  todayIsoDate,
} from '../lib/dates'
import type { CostEntry, Payee, Receipt } from '../lib/types'
import { BudgetItemCategoryHint } from '../components/BudgetItemSummaryLine'
import { CostEntryForm } from '../components/CostEntryForm'
import { FormActions } from '../components/FormActions'
import { PaymentToggle, PaymentToggleGroup } from '../components/PaymentToggle'
import {
  receiptCostTypeLabel,
  DEFAULT_PAYMENT_STATUS,
  type PaymentStatus,
  type ReceiptCostType,
} from '../lib/constants'
import { SearchableSelect } from '../components/SearchableSelect'
import { budgetLabelByIdMap } from '../lib/budgetItemDisplay'
import { budgetItemOptions, receiptCostTypeOptions } from '../lib/selectOptions'
import { formatSupabaseError } from '../lib/errors'
import { normalizePaymentStatus } from '../lib/paymentStatus'
import { supabase } from '../lib/supabase'
import { SideSheet } from '../components/SideSheet'
import { PayeeAccountsSection } from '../components/PayeeAccountsSection'
import {
  costEntryHoursDetail,
  costEntryTitle,
  receiptMetaExtra,
  receiptTitle,
} from '../lib/costLineDisplay'
import { CostLineSummary } from '../components/CostLineSummary'
import { StatCard } from '../components/StatCard'
import { totalActual } from '../lib/project'
import { clickableCardClass, selectedRowClass } from '../lib/rowStyles'

type CostsTab = 'receipts' | 'manual' | 'payees'

export function CostsPage() {
  const { data, loading, error, reload } = useProjectData()

  return (
    <LoadState loading={loading} error={error} empty={!data}>
      {data ? (
        <CostsPageContent data={data} onChanged={() => void reload()} />
      ) : null}
    </LoadState>
  )
}

function CostsPageContent({
  data,
  onChanged,
}: {
  data: NonNullable<ReturnType<typeof useProjectData>['data']>
  onChanged: () => void
}) {
  const budgetLabelById = useMemo(
    () => budgetLabelByIdMap(data.budgetItems),
    [data.budgetItems],
  )

  const { receipts, costEntries } = data
  const [tab, setTab] = useState<CostsTab>('receipts')

  const receiptTotal = useMemo(
    () => receipts.reduce((s, r) => s + Number(r.amount), 0),
    [receipts],
  )
  const manualTotal = useMemo(
    () => costEntries.reduce((s, e) => s + Number(e.amount), 0),
    [costEntries],
  )
  const actualTotal = useMemo(
    () => totalActual(receipts, costEntries),
    [receipts, costEntries],
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Faktiske kostnader</h2>
        <p className="mt-1 text-sm text-slate-600">
          Kvitteringer, manuelle poster og mottakere – alt telles i budsjettet.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Sum registrert"
          value={formatNok(actualTotal)}
          hint="Kvitteringer + manuelle"
        />
        <StatCard
          label="Kvitteringer"
          value={formatNok(receiptTotal)}
          hint={`${receipts.length} ${receipts.length === 1 ? 'post' : 'poster'}`}
        />
        <StatCard
          label="Manuelle"
          value={formatNok(manualTotal)}
          hint={`${costEntries.length} ${costEntries.length === 1 ? 'post' : 'poster'}`}
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Kostnadstype"
      >
        <CostsTabButton
          active={tab === 'receipts'}
          onClick={() => setTab('receipts')}
          count={receipts.length}
        >
          Kvitteringer
        </CostsTabButton>
        <CostsTabButton
          active={tab === 'manual'}
          onClick={() => setTab('manual')}
          count={costEntries.length}
        >
          Manuelle
        </CostsTabButton>
        <CostsTabButton
          active={tab === 'payees'}
          onClick={() => setTab('payees')}
        >
          Mottakere
        </CostsTabButton>
      </div>

      <div role="tabpanel" className="min-h-[12rem]">
        {tab === 'receipts' ? (
          <ReceiptSection
            projectId={data.project.id}
            receipts={receipts}
            budgetItems={data.budgetItems}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'manual' ? (
          <CostEntrySection
            projectId={data.project.id}
            costEntries={costEntries}
            budgetItems={data.budgetItems}
            payees={data.payees}
            onChanged={onChanged}
          />
        ) : null}
        {tab === 'payees' ? (
          <PayeeAccountsSection
            projectId={data.project.id}
            payees={data.payees}
            payeePayments={data.payeePayments}
            receipts={receipts}
            costEntries={costEntries}
            budgetLabelById={budgetLabelById}
            onChanged={onChanged}
          />
        ) : null}
      </div>
    </div>
  )
}

function CostsTabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none ${
        active
          ? 'border-slate-400 bg-white text-slate-900 shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      {children}
      {count != null && count > 0 ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
            active ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/80 text-slate-600'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

/** @deprecated use CostsPage */
export const ReceiptsPage = CostsPage

function CostEntrySection({
  projectId,
  costEntries,
  budgetItems,
  payees,
  onChanged,
}: {
  projectId: string
  costEntries: CostEntry[]
  payees: Payee[]
  budgetItems: {
    id: string
    category: string
    post: string
    hourly_rate: number | null
  }[]
  onChanged: () => void
}) {
  const [sheet, setSheet] = useState<
    { mode: 'create' } | { mode: 'edit'; entry: CostEntry } | null
  >(null)

  const labelById = useMemo(() => budgetLabelByIdMap(budgetItems), [budgetItems])

  const canWrite = useCanWrite()

  function closeSheet() {
    setSheet(null)
  }

  function openEntry(entry: CostEntry) {
    if (!canWrite) return
    setSheet({ mode: 'edit', entry })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Manuelle registreringer</h3>
        <CanWrite>
          <button
            type="button"
            onClick={() => setSheet({ mode: 'create' })}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Registrer timer / kostnad
          </button>
        </CanWrite>
      </div>

      {costEntries.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ingen manuelle registreringer ennå (f.eks. mannskapstimer).
        </p>
      ) : (
        <ul className="space-y-2">
          {costEntries.map((entry) => (
            <li key={entry.id}>
              <div
                tabIndex={0}
                role="button"
                onClick={() => openEntry(entry)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openEntry(entry)
                  }
                }}
                className={`rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm ${canWrite ? clickableCardClass : ''} ${selectedRowClass(sheet?.mode === 'edit' && sheet.entry.id === entry.id)}`}
              >
                <CostEntryRowContent
                  entry={entry}
                  budgetLabel={
                    entry.budget_item_id
                      ? labelById.get(entry.budget_item_id)
                      : undefined
                  }
                  onPaymentChange={(s) =>
                    void updateCostEntry(entry.id, {
                      payment_status: s,
                    }).then(onChanged)
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <SideSheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet?.mode === 'create'
            ? 'Registrer kostnad'
            : sheet?.mode === 'edit'
              ? costEntryTitle(sheet.entry)
              : ''
        }
        description={
          sheet?.mode === 'edit'
            ? formatNorwegianDateMedium(sheet.entry.entry_date)
            : undefined
        }
      >
        {sheet?.mode === 'create' ? (
          <CostEntryForm
            budgetItems={budgetItems}
            payees={payees}
            onCancel={closeSheet}
            onSave={async (values) => {
              await createCostEntry(projectId, values)
              closeSheet()
              onChanged()
            }}
          />
        ) : null}
        {sheet?.mode === 'edit' ? (
          <CostEntryForm
            key={sheet.entry.id}
            budgetItems={budgetItems}
            payees={payees}
            initial={sheet.entry}
            onCancel={closeSheet}
            onSave={async (values) => {
              await updateCostEntry(sheet.entry.id, values)
              closeSheet()
              onChanged()
            }}
            onDelete={async () => {
              await deleteCostEntry(sheet.entry.id)
              closeSheet()
              onChanged()
            }}
          />
        ) : null}
      </SideSheet>
    </section>
  )
}

function ReceiptSection({
  projectId,
  receipts,
  budgetItems,
  onChanged,
}: {
  projectId: string
  receipts: Receipt[]
  budgetItems: { id: string; category: string; post: string }[]
  onChanged: () => void
}) {
  const [sheet, setSheet] = useState<
    { mode: 'create' } | { mode: 'edit'; receipt: Receipt } | null
  >(null)

  const labelById = useMemo(() => budgetLabelByIdMap(budgetItems), [budgetItems])

  const canWrite = useCanWrite()

  function closeSheet() {
    setSheet(null)
  }

  function openReceipt(receipt: Receipt) {
    if (!canWrite) return
    setSheet({ mode: 'edit', receipt })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Kvitteringer</h3>
        <CanWrite>
          <button
            type="button"
            onClick={() => setSheet({ mode: 'create' })}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ny kvittering
          </button>
        </CanWrite>
      </div>

      {receipts.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ingen kvitteringer registrert ennå.
        </p>
      ) : (
        <ul className="space-y-2">
          {receipts.map((r) => (
            <li key={r.id}>
              <ReceiptRow
                receipt={r}
                budgetLabel={labelById.get(r.budget_item_id ?? '')}
                selected={sheet?.mode === 'edit' && sheet.receipt.id === r.id}
                onOpen={() => openReceipt(r)}
                onPaymentChange={(s) =>
                  void updateReceipt(r.id, { payment_status: s }).then(onChanged)
                }
              />
            </li>
          ))}
        </ul>
      )}

      <SideSheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet?.mode === 'create'
            ? 'Ny kvittering'
            : sheet?.mode === 'edit'
              ? receiptTitle(sheet.receipt)
              : ''
        }
        description={
          sheet?.mode === 'edit'
            ? `${formatNok(Number(sheet.receipt.amount))}${sheet.receipt.receipt_date ? ` · ${formatNorwegianDateMedium(sheet.receipt.receipt_date)}` : ''}`
            : sheet?.mode === 'create'
              ? 'Telles som faktisk kostnad på valgt budsjettpost.'
              : undefined
        }
      >
        {sheet?.mode === 'create' ? (
          <ReceiptForm
            projectId={projectId}
            budgetItems={budgetItems}
            onCancel={closeSheet}
            onSaved={() => {
              closeSheet()
              onChanged()
            }}
          />
        ) : null}
        {sheet?.mode === 'edit' ? (
          <ReceiptEditForm
            key={sheet.receipt.id}
            receipt={sheet.receipt}
            budgetItems={budgetItems}
            onCancel={closeSheet}
            onSaved={() => {
              closeSheet()
              onChanged()
            }}
          />
        ) : null}
      </SideSheet>
    </section>
  )
}

function ReceiptForm({
  projectId,
  budgetItems,
  onCancel,
  onSaved,
}: {
  projectId: string
  budgetItems: {
    id: string
    category: string
    post: string
    description?: string | null
  }[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [vendor, setVendor] = useState('')
  const [receiptDate, setReceiptDate] = useState(todayIsoDate)
  const [amount, setAmount] = useState('')
  const [costType, setCostType] = useState<ReceiptCostType>('materials')
  const [budgetItemId, setBudgetItemId] = useState('')
  const [description, setDescription] = useState('')
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>(DEFAULT_PAYMENT_STATUS)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedBudgetItem = useMemo(
    () => budgetItems.find((b) => b.id === budgetItemId),
    [budgetItemId, budgetItems],
  )

  async function save() {
    setFormError(null)
    if (!file) {
      setFormError('Last opp kvittering (bilde eller PDF).')
      return
    }
    const parsedAmount = parseAmount(amount)
    if (parsedAmount <= 0) {
      setFormError('Angi et gyldig beløp.')
      return
    }
    setBusy(true)
    let storagePath: string | null = null
    try {
      storagePath = await uploadReceiptFile(projectId, file)
      await createReceipt({
        project_id: projectId,
        budget_item_id: budgetItemId || null,
        payee_id: null,
        vendor: vendor.trim(),
        receipt_date: receiptDate || null,
        amount: parsedAmount,
        vat_amount: null,
        cost_type: costType,
        description: description.trim(),
        storage_path: storagePath,
        payment_status: paymentStatus,
      })
      setFile(null)
      setVendor('')
      setReceiptDate(todayIsoDate())
      setAmount('')
      setCostType('materials')
      setBudgetItemId('')
      setDescription('')
      setPaymentStatus(DEFAULT_PAYMENT_STATUS)
      onSaved()
    } catch (err) {
      if (storagePath) {
        await supabase.storage.from('receipts').remove([storagePath])
      }
      setFormError(formatSupabaseError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="space-y-4"
    >
        <ReceiptFilePicker file={file} onFileChange={setFile} disabled={busy} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Leverandør">
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Dato">
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="input"
              disabled={busy}
            />
          </Field>
          <Field label="Beløp inkl. mva (kr)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="input"
              required
            />
          </Field>
          <Field label="Type">
            <SearchableSelect
              value={costType}
              onChange={(v) => setCostType(v as ReceiptCostType)}
              options={receiptCostTypeOptions()}
              searchPlaceholder="Søk type …"
            />
          </Field>
          <Field label="Budsjettpost" className="sm:col-span-2">
            <SearchableSelect
              value={budgetItemId}
              onChange={setBudgetItemId}
              options={budgetItemOptions(budgetItems)}
              allowEmpty
              emptyLabel="— Ikke knyttet —"
              searchPlaceholder="Søk budsjettpost …"
            />
            <BudgetItemCategoryHint item={selectedBudgetItem} />
          </Field>
        </div>

        <Field label="Betaling">
          <PaymentToggleGroup value={paymentStatus} onChange={setPaymentStatus} />
        </Field>

        <Field label="Beskrivelse / notat">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input"
            placeholder="F.eks. hva du kjøpte, rom/prosjekt, ordrenummer …"
          />
        </Field>

        {formError ? (
          <p className="text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}

        <FormActions
          busy={busy}
          saveLabel="Lagre kvittering"
          onSave={() => void save()}
          onCancel={onCancel}
        />
      </form>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm ${className ?? ''}`}>
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function ReceiptEditForm({
  receipt,
  budgetItems,
  onCancel,
  onSaved,
}: {
  receipt: Receipt
  budgetItems: {
    id: string
    category: string
    post: string
    description?: string | null
  }[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [vendor, setVendor] = useState(receipt.vendor)
  const [receiptDate, setReceiptDate] = useState(receipt.receipt_date ?? '')
  const [amount, setAmount] = useState(String(receipt.amount))
  const [costType, setCostType] = useState(receipt.cost_type)
  const [budgetItemId, setBudgetItemId] = useState(receipt.budget_item_id ?? '')
  const [description, setDescription] = useState(receipt.description)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    normalizePaymentStatus(receipt.payment_status),
  )
  const [busy, setBusy] = useState(false)

  const selectedBudgetItem = useMemo(
    () => budgetItems.find((b) => b.id === budgetItemId),
    [budgetItemId, budgetItems],
  )

  async function save() {
    setBusy(true)
    try {
      await updateReceipt(receipt.id, {
        vendor: vendor.trim(),
        receipt_date: receiptDate || null,
        amount: parseAmount(amount),
        vat_amount: null,
        cost_type: costType,
        budget_item_id: budgetItemId || null,
        payee_id: null,
        description: description.trim(),
        payment_status: paymentStatus,
      })
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteReceipt(receipt)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <StoredReceiptPreview storagePath={receipt.storage_path} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Leverandør">
          <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>
        <Field label="Dato">
          <input
            type="date"
            className="input"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            disabled={busy}
          />
        </Field>
        <Field label="Beløp inkl. mva">
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Type">
          <SearchableSelect
            value={costType}
            onChange={(v) => setCostType(v as ReceiptCostType)}
            options={receiptCostTypeOptions()}
            searchPlaceholder="Søk type …"
          />
        </Field>
        <Field label="Budsjettpost" className="sm:col-span-2">
          <SearchableSelect
            value={budgetItemId}
            onChange={setBudgetItemId}
            options={budgetItemOptions(budgetItems)}
            allowEmpty
            emptyLabel="— Ikke knyttet —"
            searchPlaceholder="Søk budsjettpost …"
          />
          <BudgetItemCategoryHint item={selectedBudgetItem} />
        </Field>
      </div>
      <Field label="Betaling">
        <PaymentToggleGroup value={paymentStatus} onChange={setPaymentStatus} />
      </Field>
      <Field label="Beskrivelse / notat">
        <textarea
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="F.eks. hva du kjøpte, rom/prosjekt, ordrenummer …"
        />
      </Field>
      <FormActions busy={busy} onSave={() => void save()} onCancel={onCancel} onDelete={() => void remove()} />
    </div>
  )
}

function CostEntryRowContent({
  entry,
  budgetLabel,
  onPaymentChange,
}: {
  entry: CostEntry
  budgetLabel?: string
  onPaymentChange: (status: PaymentStatus) => void
}) {
  const title = costEntryTitle(entry)

  return (
    <CostLineSummary
      title={title}
      amount={Number(entry.amount)}
      dateLabel={formatNorwegianDate(entry.entry_date)}
      costType={entry.cost_type}
      costTypeLabel={receiptCostTypeLabel(entry.cost_type)}
      recordKind="cost"
      budgetLabel={budgetLabel}
      hoursDetail={costEntryHoursDetail(entry)}
      footer={
        !entry.payee_id ? (
          <PaymentToggle
            value={entry.payment_status}
            onChange={onPaymentChange}
          />
        ) : undefined
      }
    />
  )
}

function ReceiptRow({
  receipt,
  budgetLabel,
  selected,
  onOpen,
  onPaymentChange,
}: {
  receipt: Receipt
  budgetLabel?: string
  selected: boolean
  onOpen: () => void
  onPaymentChange: (status: PaymentStatus) => void
}) {
  async function openFile(e: React.MouseEvent) {
    e.stopPropagation()
    const url = await signedReceiptUrl(receipt.storage_path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const title = receiptTitle(receipt)
  const metaExtra = receiptMetaExtra(receipt, title)

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm ${clickableCardClass} ${selectedRowClass(selected)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <CostLineSummary
          title={title}
          amount={Number(receipt.amount)}
          dateLabel={formatNorwegianDate(receipt.receipt_date)}
          costType={receipt.cost_type}
          costTypeLabel={receiptCostTypeLabel(receipt.cost_type)}
          recordKind="receipt"
          budgetLabel={budgetLabel}
          vendorOrExtra={metaExtra}
          footer={
            <PaymentToggle
              value={receipt.payment_status}
              onChange={onPaymentChange}
            />
          }
        />
        <button
          type="button"
          onClick={(e) => void openFile(e)}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-white"
        >
          Vis fil
        </button>
      </div>
    </div>
  )
}
