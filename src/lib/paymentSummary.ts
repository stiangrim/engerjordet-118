import type { PaymentStatus, ReceiptCostType } from './constants'
import { normalizePaymentStatus } from './paymentStatus'
import type { CostEntry, Receipt } from './types'

/** Håndverker – det du typisk betaler i etterkant. */
export const WORKER_COST_TYPES: ReceiptCostType[] = ['subcontractor']

export function isWorkerCostType(type: ReceiptCostType | string): boolean {
  return type === 'subcontractor' || type === 'labor'
}

export type WorkerPaymentSummary = {
  /** Alt ført arbeid (telles også i budsjett/faktisk). */
  registered: number
  paid: number
  /** Registrert arbeid merket «Ikke betalt». */
  unpaid: number
}

export type WorkerPaymentLine = {
  id: string
  kind: 'cost' | 'receipt'
  amount: number
  paymentStatus: PaymentStatus
  costType: ReceiptCostType
  title: string
  date: string | null
  budgetItemId: string | null
}

function addAmount(
  summary: WorkerPaymentSummary,
  amount: number,
  status: PaymentStatus,
) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return
  summary.registered += n
  if (status === 'Betalt') summary.paid += n
  else summary.unpaid += n
}

export function summarizeWorkerPayments(
  receipts: Receipt[],
  costEntries: CostEntry[],
): WorkerPaymentSummary {
  const summary: WorkerPaymentSummary = {
    registered: 0,
    paid: 0,
    unpaid: 0,
  }

  for (const e of costEntries) {
    if (!isWorkerCostType(e.cost_type)) continue
    if (e.payee_id) continue
    addAmount(summary, e.amount, normalizePaymentStatus(e.payment_status))
  }
  for (const r of receipts) {
    if (!isWorkerCostType(r.cost_type)) continue
    if (r.payee_id) continue
    addAmount(summary, r.amount, normalizePaymentStatus(r.payment_status))
  }

  return summary
}

export function listWorkerPaymentLines(
  receipts: Receipt[],
  costEntries: CostEntry[],
  options: { unpaidOnly?: boolean } = {},
): WorkerPaymentLine[] {
  const lines: WorkerPaymentLine[] = []

  for (const e of costEntries) {
    if (!isWorkerCostType(e.cost_type)) continue
    if (e.payee_id) continue
    const paymentStatus = normalizePaymentStatus(e.payment_status)
    if (options.unpaidOnly && paymentStatus === 'Betalt') continue
    lines.push({
      id: e.id,
      kind: 'cost',
      amount: Number(e.amount),
      paymentStatus,
      costType: e.cost_type,
      title: e.description.trim() || 'Manuell kostnad',
      date: e.entry_date,
      budgetItemId: e.budget_item_id,
    })
  }
  for (const r of receipts) {
    if (!isWorkerCostType(r.cost_type)) continue
    if (r.payee_id) continue
    const paymentStatus = normalizePaymentStatus(r.payment_status)
    if (options.unpaidOnly && paymentStatus === 'Betalt') continue
    lines.push({
      id: r.id,
      kind: 'receipt',
      amount: Number(r.amount),
      paymentStatus,
      costType: r.cost_type,
      title: r.description.trim() || r.vendor.trim() || 'Kvittering',
      date: r.receipt_date,
      budgetItemId: r.budget_item_id,
    })
  }

  lines.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  return lines
}
