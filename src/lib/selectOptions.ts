import {
  RECEIPT_COST_TYPES,
  RECEIPT_COST_TYPE_LABELS,
} from './constants'
import type { SearchableSelectOption } from '../components/SearchableSelect'
import {
  budgetItemPrimarySecondary,
  budgetItemSearchKeywords,
  type BudgetItemLike,
} from './budgetItemDisplay'

export function receiptCostTypeOptions(): SearchableSelectOption[] {
  return RECEIPT_COST_TYPES.map((k) => ({
    value: k,
    label: RECEIPT_COST_TYPE_LABELS[k],
  }))
}

export function budgetItemOptions(
  items: (BudgetItemLike & { id: string })[],
): SearchableSelectOption[] {
  return items.map((b) => ({
    value: b.id,
    label: b.post,
    subLabel: budgetItemPrimarySecondary(b).secondary ?? undefined,
    group: b.category,
    keywords: budgetItemSearchKeywords(b),
  }))
}

export function payeeOptions(payees: { id: string; name: string }[]): SearchableSelectOption[] {
  return payees.map((p) => ({ value: p.id, label: p.name }))
}
