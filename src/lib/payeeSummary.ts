import type { CostEntry, Payee, PayeePayment, Receipt } from './types'

export type PayeeBalance = {
  payee: Payee
  /** Sum av kostnader/kvitteringer knyttet til mottakeren (budsjettfordeling). */
  linkedTotal: number
  lineCount: number
  /** Sum knyttede poster + ekstra skyldig. */
  owed: number
  extraOwed: number
  paid: number
  remaining: number
  payments: PayeePayment[]
}

export function sumLinkedToPayee(
  payeeId: string,
  costEntries: CostEntry[],
  _receipts?: Receipt[],
): { total: number; count: number } {
  let total = 0
  let count = 0
  for (const e of costEntries) {
    if (e.payee_id !== payeeId) continue
    total += Number(e.amount)
    count += 1
  }
  return { total, count }
}

export function sumPayeePayments(payments: PayeePayment[]): number {
  let total = 0
  for (const p of payments) {
    total += Number(p.amount)
  }
  return total
}

export function groupPayeePaymentsByPayeeId(
  payments: PayeePayment[],
): Map<string, PayeePayment[]> {
  const map = new Map<string, PayeePayment[]>()
  for (const p of payments) {
    const list = map.get(p.payee_id) ?? []
    list.push(p)
    map.set(p.payee_id, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => {
      const d = b.payment_date.localeCompare(a.payment_date)
      if (d !== 0) return d
      return b.created_at.localeCompare(a.created_at)
    })
  }
  return map
}

export function computePayeeBalance(
  payee: Payee,
  costEntries: CostEntry[],
  receipts: Receipt[],
  payments: PayeePayment[] = [],
): PayeeBalance {
  const { total: linkedTotal, count: lineCount } = sumLinkedToPayee(
    payee.id,
    costEntries,
    receipts,
  )
  const extraOwed = Math.max(0, Number(payee.extra_owed) || 0)
  const owed = linkedTotal + extraOwed
  const paid = sumPayeePayments(payments)
  const remaining = Math.max(0, owed - paid)

  return {
    payee,
    linkedTotal,
    lineCount,
    owed,
    extraOwed,
    paid,
    remaining,
    payments,
  }
}

export function computeAllPayeeBalances(
  payees: Payee[],
  costEntries: CostEntry[],
  receipts: Receipt[],
  payeePayments: PayeePayment[] = [],
): PayeeBalance[] {
  const byPayee = groupPayeePaymentsByPayeeId(payeePayments)
  return payees
    .map((p) =>
      computePayeeBalance(
        p,
        costEntries,
        receipts,
        byPayee.get(p.id) ?? [],
      ),
    )
    .sort((a, b) => a.payee.name.localeCompare(b.payee.name, 'nb'))
}
