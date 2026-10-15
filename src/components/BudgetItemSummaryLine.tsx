import {
  budgetItemPrimarySecondary,
  type BudgetItemLike,
} from '../lib/budgetItemDisplay'

export function BudgetItemSummaryLine({
  item,
  boxed,
}: {
  item: BudgetItemLike
  boxed?: boolean
}) {
  const { primary, secondary } = budgetItemPrimarySecondary(item)
  const inner = (
    <>
      <p className="font-medium text-slate-900">{primary}</p>
      {secondary ? (
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{secondary}</p>
      ) : null}
    </>
  )
  if (boxed) {
    return (
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {inner}
      </div>
    )
  }
  return <div className="text-sm">{inner}</div>
}

export function BudgetItemCategoryHint({
  item,
}: {
  item: BudgetItemLike | undefined
}) {
  if (!item) return null
  return (
    <p className="mt-1 text-xs text-slate-500">Kategori: {item.category}</p>
  )
}
