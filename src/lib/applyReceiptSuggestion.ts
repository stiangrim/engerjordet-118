import type { ReceiptCostType, ReceiptParseSuggestion } from './types'

export type BudgetOption = { id: string; label: string }

export type ReceiptFormSlice = {
  vendor: string
  receiptDate: string
  amount: string
  costType: ReceiptCostType
  budgetItemId: string
  description: string
}

export function matchBudgetItemFromHint(
  hint: string,
  options: BudgetOption[],
  fixedBudgetItemId?: string,
): string | null {
  if (fixedBudgetItemId) return fixedBudgetItemId
  const h = hint.toLowerCase().trim()
  if (!h) return null
  const exact = options.find((o) => o.label.toLowerCase().includes(h))
  if (exact) return exact.id
  const words = h.split(/\s+/).filter((w) => w.length > 2)
  for (const word of words) {
    const match = options.find((o) => o.label.toLowerCase().includes(word))
    if (match) return match.id
  }
  return null
}

export function applyReceiptSuggestion(
  suggestion: ReceiptParseSuggestion,
  current: ReceiptFormSlice,
  budgetOptions: BudgetOption[],
  fixedBudgetItemId?: string,
): ReceiptFormSlice {
  const next = { ...current }
  if (suggestion.vendor) next.vendor = suggestion.vendor
  if (suggestion.receipt_date) next.receiptDate = suggestion.receipt_date
  if (suggestion.amount != null) next.amount = String(suggestion.amount)
  if (suggestion.cost_type) next.costType = suggestion.cost_type
  if (suggestion.description) next.description = suggestion.description
  if (suggestion.budget_item_hint) {
    const id = matchBudgetItemFromHint(
      suggestion.budget_item_hint,
      budgetOptions,
      fixedBudgetItemId,
    )
    if (id) next.budgetItemId = id
  } else if (fixedBudgetItemId) {
    next.budgetItemId = fixedBudgetItemId
  }
  return next
}
