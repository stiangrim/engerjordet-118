import { useMemo } from 'react'
import { formatNorwegianDate } from '../lib/dates'
import { formatNok } from '../lib/money'
import {
  listWorkerPaymentLines,
  summarizeWorkerPayments,
} from '../lib/paymentSummary'
import { receiptCostTypeLabel } from '../lib/constants'
import type { CostEntry, Receipt } from '../lib/types'
import { CostLineSummary } from './CostLineSummary'
import { StatCard } from './StatCard'
import { PaymentToggle } from './PaymentToggle'
import type { PaymentStatus } from '../lib/constants'
import { updateCostEntry, updateReceipt } from '../lib/project'

type Props = {
  receipts: Receipt[]
  costEntries: CostEntry[]
  budgetLabelById: Map<string, string>
  onChanged: () => void
  compact?: boolean
}

export function WorkerPaymentOverview({
  receipts,
  costEntries,
  budgetLabelById,
  onChanged,
  compact,
}: Props) {
  const summary = useMemo(
    () => summarizeWorkerPayments(receipts, costEntries),
    [receipts, costEntries],
  )
  const unpaidLines = useMemo(
    () =>
      listWorkerPaymentLines(receipts, costEntries, { unpaidOnly: true }),
    [receipts, costEntries],
  )

  if (summary.registered === 0 && !compact) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-medium">Arbeid uten mottaker</h3>
        <p className="mt-2 text-sm text-slate-600">
          Poster uten valgt mottaker kan fortsatt merkes Betalt / Ikke betalt
          per linje. Knytt heller til en mottaker (f.eks. Dalius) for samlet
          oppfølging.
        </p>
      </section>
    )
  }

  if (summary.registered === 0) return null

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="font-medium">Arbeid uten mottaker</h3>
        <p className="mt-1 text-sm text-slate-600">
          Kun poster som ikke er knyttet til en mottaker. For Dalius m.m., bruk
          mottaker-kortet over.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Registrert arbeid"
          value={formatNok(summary.registered)}
          hint="Telles i faktisk kostnad"
        />
        <StatCard
          label="Betalt"
          value={formatNok(summary.paid)}
        />
        <StatCard
          label="Gjenstår å betale"
          value={formatNok(summary.unpaid)}
          hint={
            summary.unpaid > 0
              ? 'Klikk «Betalt» på posten når du har betalt'
              : undefined
          }
        />
      </div>

      {unpaidLines.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-slate-800">
            Utestående ({unpaidLines.length})
          </h4>
          <ul className="mt-2 space-y-2">
            {unpaidLines.map((line) => (
              <li
                key={`${line.kind}-${line.id}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-red-100 bg-red-50/40 px-3 py-2 text-sm"
              >
                <CostLineSummary
                  dense
                  title={line.title}
                  amount={line.amount}
                  dateLabel={formatNorwegianDate(line.date)}
                  costType={line.costType}
                  costTypeLabel={receiptCostTypeLabel(line.costType)}
                  recordKind={line.kind}
                  budgetLabel={
                    line.budgetItemId
                      ? budgetLabelById.get(line.budgetItemId)
                      : undefined
                  }
                  footer={
                    <PaymentToggle
                      value={line.paymentStatus}
                      onChange={(s: PaymentStatus) => {
                        if (line.kind === 'cost') {
                          void updateCostEntry(line.id, {
                            payment_status: s,
                          }).then(onChanged)
                        } else {
                          void updateReceipt(line.id, {
                            payment_status: s,
                          }).then(onChanged)
                        }
                      }}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
