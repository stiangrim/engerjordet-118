export const ITEM_STATUSES = [
  'Ikke startet',
  'Pågår',
  'Ferdig',
  'Avvik',
] as const

export type ItemStatus = (typeof ITEM_STATUSES)[number]

export const PAYMENT_STATUSES = ['Betalt', 'Ikke betalt'] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const DEFAULT_PAYMENT_STATUS: PaymentStatus = 'Betalt'

/** Kostnadstype på kvitteringer og manuelle poster */
export const RECEIPT_COST_TYPES = [
  'materials',
  'tools',
  'equipment_rental',
  'transport',
  'subcontractor',
  'fees',
  'waste',
  'other',
] as const

export type ReceiptCostType = (typeof RECEIPT_COST_TYPES)[number]

export const RECEIPT_COST_TYPE_LABELS: Record<ReceiptCostType, string> = {
  materials: 'Materialer',
  tools: 'Verktøy',
  equipment_rental: 'Leie (stillas, maskiner)',
  transport: 'Frakt og levering',
  subcontractor: 'Håndverker',
  fees: 'Gebyrer og avgifter',
  waste: 'Avfall og deponi',
  other: 'Annet',
}

/** Slår sammen i mat/arbeid-kolonner i budsjett (total inkluderer alle) */
export const COST_TYPE_BUDGET_BUCKET: Record<
  ReceiptCostType,
  'materials' | 'labor' | 'other'
> = {
  materials: 'materials',
  tools: 'materials',
  transport: 'materials',
  waste: 'materials',
  subcontractor: 'labor',
  equipment_rental: 'other',
  fees: 'other',
  other: 'other',
}

/** Hvordan innbetaling til mottaker ble gjort */
export const PAYEE_PAYMENT_METHODS = [
  'Vipps',
  'Kontant',
  'Bankoverføring',
  'Kort',
  'Annet',
] as const

export type PayeePaymentMethod = (typeof PAYEE_PAYMENT_METHODS)[number]

/** DB kan fortsatt ha legacy `labor` til migrasjon er kjørt. */
export function costTypeBudgetBucket(
  type: string,
): 'materials' | 'labor' | 'other' {
  if (type === 'labor') return 'labor'
  if (type in COST_TYPE_BUDGET_BUCKET) {
    return COST_TYPE_BUDGET_BUCKET[type as ReceiptCostType]
  }
  return 'other'
}

export function normalizeReceiptCostType(type: string): ReceiptCostType {
  if (type === 'labor') return 'subcontractor'
  if ((RECEIPT_COST_TYPES as readonly string[]).includes(type)) {
    return type as ReceiptCostType
  }
  return 'other'
}

export function receiptCostTypeLabel(type: string): string {
  if (type === 'labor') return 'Håndverker'
  if (type in RECEIPT_COST_TYPE_LABELS) {
    return RECEIPT_COST_TYPE_LABELS[type as ReceiptCostType]
  }
  return type
}
