import { useMemo, useState } from 'react'
import { CanWrite } from './CanWrite'
import { useCanWrite } from '../access/AccessContext'
import { SideSheet } from './SideSheet'
import { FormActions } from './FormActions'
import { PayeePaymentsEditor } from './PayeePaymentsEditor'
import { StatCard } from './StatCard'
import { WorkerPaymentOverview } from './WorkerPaymentOverview'
import { formatNorwegianDate } from '../lib/dates'
import { formatNok, parseAmount } from '../lib/money'
import {
  computeAllPayeeBalances,
  sumLinkedToPayee,
} from '../lib/payeeSummary'
import type { PayeeBalance } from '../lib/payeeSummary'
import {
  createPayee,
  deletePayee,
  updatePayee,
  type PayeeWrite,
} from '../lib/project'
import type { CostEntry, Payee, PayeePayment, Receipt } from '../lib/types'
import { MetaLine } from './MetaLine'
import { CalendarIcon, TagIcon } from './icons'

type Props = {
  projectId: string
  payees: Payee[]
  payeePayments: PayeePayment[]
  receipts: Receipt[]
  costEntries: CostEntry[]
  budgetLabelById: Map<string, string>
  onChanged: () => void
}

export function PayeeAccountsSection({
  projectId,
  payees,
  payeePayments,
  receipts,
  costEntries,
  budgetLabelById,
  onChanged,
}: Props) {
  const balances = useMemo(
    () =>
      computeAllPayeeBalances(
        payees,
        costEntries,
        receipts,
        payeePayments,
      ),
    [payees, costEntries, receipts, payeePayments],
  )
  const canWrite = useCanWrite()
  const [sheet, setSheet] = useState<
    { mode: 'create' } | { mode: 'edit'; payee: Payee } | null
  >(null)

  function openPayee(payee: Payee) {
    if (!canWrite) return
    setSheet({ mode: 'edit', payee })
  }

  function closeSheet() {
    setSheet(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">Mottakere (hvem du skylder)</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Knytt timer og kostnader til en mottaker på hver budsjettpost.
            <span className="font-medium"> Skyldig totalt</span> følger sum
            knyttede poster pluss valgfritt ekstra. Registrer{' '}
            <span className="font-medium">innbetalinger</span> (Vipps, kontant
            osv.) – summen blir «betalt totalt».
          </p>
        </div>
        <CanWrite>
          <button
            type="button"
            onClick={() => setSheet({ mode: 'create' })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Ny mottaker
          </button>
        </CanWrite>
      </div>

      {balances.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ingen mottakere ennå. Kjør migrasjon 006_payees.sql eller opprett en
          mottaker.
        </p>
      ) : (
        <ul className="space-y-3">
          {balances.map((b) => (
            <li key={b.payee.id}>
              <PayeeBalanceCard
                balance={b}
                onEdit={() => openPayee(b.payee)}
              />
            </li>
          ))}
        </ul>
      )}

      <WorkerPaymentOverview
        receipts={receipts}
        costEntries={costEntries}
        budgetLabelById={budgetLabelById}
        onChanged={onChanged}
        compact
      />

      <SideSheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet?.mode === 'create'
            ? 'Ny mottaker'
            : sheet?.mode === 'edit'
              ? sheet.payee.name
              : ''
        }
        description={
          sheet?.mode === 'edit'
            ? 'Skyldig, innbetalinger og notat'
            : undefined
        }
      >
        {sheet?.mode === 'create' ? (
          <PayeeForm
            linkedTotal={0}
            lineCount={0}
            onCancel={closeSheet}
            onSave={async (values) => {
              await createPayee(projectId, values)
              closeSheet()
              onChanged()
            }}
          />
        ) : null}
        {sheet?.mode === 'edit' ? (
          <div className="space-y-6">
            <PayeeForm
              key={sheet.payee.id}
              initial={sheet.payee}
              linkedTotal={
                sumLinkedToPayee(sheet.payee.id, costEntries, receipts).total
              }
              lineCount={
                sumLinkedToPayee(sheet.payee.id, costEntries, receipts).count
              }
              onCancel={closeSheet}
              onSave={async (values) => {
                await updatePayee(sheet.payee.id, values)
                closeSheet()
                onChanged()
              }}
              onDelete={async () => {
                await deletePayee(sheet.payee.id)
                closeSheet()
                onChanged()
              }}
            />
            <CanWrite>
              <PayeePaymentsEditor
                payeeId={sheet.payee.id}
                payments={payeePayments.filter(
                  (p) => p.payee_id === sheet.payee.id,
                )}
                onChanged={onChanged}
              />
            </CanWrite>
          </div>
        ) : null}
      </SideSheet>
    </section>
  )
}

function PayeeBalanceCard({
  balance,
  onEdit,
}: {
  balance: PayeeBalance
  onEdit: () => void
}) {
  const {
    payee,
    linkedTotal,
    lineCount,
    owed,
    extraOwed,
    paid,
    remaining,
    payments,
  } = balance
  const preview = payments.slice(0, 3)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{payee.name}</p>
          <p className="text-xs text-slate-500">
            {lineCount} knyttede poster · fra poster {formatNok(linkedTotal)}
            {extraOwed > 0 ? ` · ekstra ${formatNok(extraOwed)}` : ''}
            {payments.length > 0
              ? ` · ${payments.length} innbetaling${payments.length === 1 ? '' : 'er'}`
              : ''}
          </p>
        </div>
        <CanWrite>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Rediger
          </button>
        </CanWrite>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StatCard label="Skyldig totalt" value={formatNok(owed)} />
        <StatCard label="Betalt totalt" value={formatNok(paid)} />
        <StatCard
          label="Gjenstår"
          value={formatNok(remaining)}
          hint={
            remaining > 0
              ? 'Legg til innbetaling under Rediger'
              : undefined
          }
        />
      </div>
      {preview.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {preview.map((p) => (
            <li key={p.id} className="text-sm">
              <p className="font-medium tabular-nums">{formatNok(Number(p.amount))}</p>
              <MetaLine icon={CalendarIcon} className="text-xs">
                {formatNorwegianDate(p.payment_date)}
              </MetaLine>
              <MetaLine icon={TagIcon} className="text-xs">
                {p.method.trim() || 'Ukjent'}
                {p.note.trim() ? ` · ${p.note}` : ''}
              </MetaLine>
            </li>
          ))}
          {payments.length > preview.length ? (
            <li className="text-xs text-slate-500">
              + {payments.length - preview.length} til under Rediger
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

function PayeeForm({
  initial,
  linkedTotal,
  lineCount,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Payee
  linkedTotal: number
  lineCount: number
  onSave: (values: PayeeWrite) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [extraOwed, setExtraOwed] = useState(
    initial ? String(initial.extra_owed ?? 0) : '0',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSave({
        name: name.trim(),
        extra_owed: extraOwed.trim() ? parseAmount(extraOwed) : 0,
        notes: notes.trim(),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {initial ? (
        <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>
            {lineCount} poster knyttet · fra faktiske kostnader{' '}
            {formatNok(linkedTotal)}
          </p>
          <p className="font-medium tabular-nums text-slate-900">
            Skyldig totalt (nå):{' '}
            {formatNok(
              linkedTotal + (extraOwed.trim() ? parseAmount(extraOwed) : 0),
            )}
          </p>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="font-medium">Navn</span>
        <input
          className="input mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="F.eks. håndverker eller firma"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Ekstra skyldig utover poster (kr)</span>
        <input
          className="input mt-1"
          value={extraOwed}
          onChange={(e) => setExtraOwed(e.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
        <p className="mt-1 text-xs text-slate-500">
          Avtaler, materialer uten kvittering, eller annet som ikke ligger som
          egen post. Poster med denne mottakeren telles automatisk.
        </p>
      </label>

      <label className="block text-sm">
        <span className="font-medium">Notat på mottaker</span>
        <textarea
          className="input mt-1"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <FormActions
        busy={busy}
        onSave={() => void save()}
        onCancel={onCancel}
        onDelete={onDelete ? () => void onDelete() : undefined}
      />
    </div>
  )
}
