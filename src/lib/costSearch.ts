import { receiptCostTypeLabel } from './constants'
import { formatNorwegianDate, formatNorwegianDateMedium } from './dates'
import { normalizePaymentStatus } from './paymentStatus'
import type { CostEntry, Receipt } from './types'

/** Lowercase, accents folded (é → e, å → a), so "monter" finds "Montér". */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
}

/** Every way a person might type an amount: 5771,99 · 5771.99 · 5771 · 5 772. */
function amountSearchText(amount: number): string {
  const rounded = Math.round(amount)
  const fixed = amount.toFixed(2)
  return [
    fixed,
    fixed.replace('.', ','),
    String(rounded),
    rounded.toLocaleString('nb-NO').replace(/\s/g, ' '),
  ].join(' ')
}

function dateSearchText(iso: string | null): string {
  if (!iso) return ''
  return [iso, formatNorwegianDate(iso), formatNorwegianDateMedium(iso)].join(' ')
}

/** All words in the query must appear somewhere in the haystack. */
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = foldForSearch(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((t) => haystack.includes(t))
}

export type CostLine = {
  kind: 'receipt' | 'manual'
  id: string
  date: string | null
  amount: number
  costType: string
  budgetItemId: string | null
  payeeId: string | null
  paymentStatus: string
  vendor: string
  description: string
  /** Folded text for search; built once per list. */
  haystack: string
}

type Lookups = {
  budgetLabelById: Map<string, string>
  payeeNameById?: Map<string, string>
}

function haystackFor(
  parts: (string | null | undefined)[],
): string {
  return foldForSearch(parts.filter(Boolean).join(' \u0001 '))
}

export function receiptLine(r: Receipt, lookups: Lookups): CostLine {
  const amount = Number(r.amount)
  const budget = r.budget_item_id ? lookups.budgetLabelById.get(r.budget_item_id) : ''
  const payee = r.payee_id ? lookups.payeeNameById?.get(r.payee_id) : ''
  return {
    kind: 'receipt',
    id: r.id,
    date: r.receipt_date,
    amount,
    costType: r.cost_type,
    budgetItemId: r.budget_item_id,
    payeeId: r.payee_id ?? null,
    paymentStatus: normalizePaymentStatus(r.payment_status),
    vendor: r.vendor,
    description: r.description,
    haystack: haystackFor([
      r.vendor,
      r.description,
      budget,
      payee,
      receiptCostTypeLabel(r.cost_type),
      normalizePaymentStatus(r.payment_status),
      amountSearchText(amount),
      dateSearchText(r.receipt_date),
      'kvittering',
    ]),
  }
}

export function costEntryLine(e: CostEntry, lookups: Lookups): CostLine {
  const amount = Number(e.amount)
  const budget = e.budget_item_id ? lookups.budgetLabelById.get(e.budget_item_id) : ''
  const payee = e.payee_id ? lookups.payeeNameById?.get(e.payee_id) ?? '' : ''
  return {
    kind: 'manual',
    id: e.id,
    date: e.entry_date,
    amount,
    costType: e.cost_type,
    budgetItemId: e.budget_item_id,
    payeeId: e.payee_id ?? null,
    paymentStatus: normalizePaymentStatus(e.payment_status),
    vendor: payee,
    description: e.description,
    haystack: haystackFor([
      e.description,
      payee,
      budget,
      receiptCostTypeLabel(e.cost_type),
      normalizePaymentStatus(e.payment_status),
      e.hours != null ? `${e.hours} t timer` : '',
      amountSearchText(amount),
      dateSearchText(e.entry_date),
      'manuell',
    ]),
  }
}

export type CostSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export const COST_SORT_LABELS: Record<CostSort, string> = {
  date_desc: 'Nyeste først',
  date_asc: 'Eldste først',
  amount_desc: 'Høyeste beløp',
  amount_asc: 'Laveste beløp',
}

/** '' means "no filter" for every field. */
export type CostFilter = {
  query: string
  budgetItemId: string
  costType: string
  paymentStatus: string
  sort: CostSort
}

export const EMPTY_COST_FILTER: CostFilter = {
  query: '',
  budgetItemId: '',
  costType: '',
  paymentStatus: '',
  sort: 'date_desc',
}

/** Budget filter value for lines with no budget item. */
export const NO_BUDGET_ITEM = '__none__'

export function isCostFilterActive(f: CostFilter): boolean {
  return Boolean(f.query.trim() || f.budgetItemId || f.costType || f.paymentStatus)
}

export function applyCostFilter<T extends CostLine>(lines: T[], f: CostFilter): T[] {
  const hits = lines.filter(
    (l) =>
      matchesQuery(l.haystack, f.query) &&
      (!f.budgetItemId ||
        (f.budgetItemId === NO_BUDGET_ITEM
          ? !l.budgetItemId
          : l.budgetItemId === f.budgetItemId)) &&
      (!f.costType || l.costType === f.costType) &&
      (!f.paymentStatus || l.paymentStatus === f.paymentStatus),
  )
  const byDate = (a: T, b: T) => (a.date ?? '').localeCompare(b.date ?? '')
  const sorters: Record<CostSort, (a: T, b: T) => number> = {
    date_desc: (a, b) => byDate(b, a) || b.amount - a.amount,
    date_asc: (a, b) => byDate(a, b) || a.amount - b.amount,
    amount_desc: (a, b) => b.amount - a.amount || byDate(b, a),
    amount_asc: (a, b) => a.amount - b.amount || byDate(b, a),
  }
  return [...hits].sort(sorters[f.sort])
}

function csvCell(value: string | number): string {
  const s = String(value)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Semicolon CSV with decimal comma and BOM, so Excel in Norwegian opens it as-is. */
export function costLinesToCsv(
  lines: CostLine[],
  budgetLabelById: Map<string, string>,
): string {
  const header = [
    'Dato',
    'Kilde',
    'Leverandør/mottaker',
    'Beskrivelse',
    'Beløp inkl. mva',
    'Type',
    'Budsjettpost',
    'Betaling',
  ]
  const rows = lines.map((l) => [
    l.date ?? '',
    l.kind === 'receipt' ? 'Kvittering' : 'Manuell',
    l.vendor,
    l.description,
    l.amount.toFixed(2).replace('.', ','),
    receiptCostTypeLabel(l.costType),
    l.budgetItemId ? budgetLabelById.get(l.budgetItemId) ?? '' : '',
    l.paymentStatus,
  ])
  return (
    '﻿' +
    [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
  )
}
