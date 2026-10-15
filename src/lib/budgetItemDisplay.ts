export type BudgetItemLike = {
  category: string
  post: string
  description?: string | null
}

/** Slik budsjett-tabellen viser en rad: post + beskrivelse (kategori er gruppeoverskrift). */
export function budgetItemPrimarySecondary(item: BudgetItemLike): {
  primary: string
  secondary: string | null
} {
  const desc = item.description?.trim()
  const secondary =
    desc && desc !== item.post ? desc : null
  return { primary: item.post, secondary }
}

/** Én linje til lister (kvittering/manuell) når det må være kompakt. */
export function budgetItemCompactLabel(item: BudgetItemLike): string {
  const { primary, secondary } = budgetItemPrimarySecondary(item)
  if (secondary) return `${primary} — ${secondary}`
  return `${item.category} · ${primary}`
}

export function budgetItemSearchKeywords(item: BudgetItemLike): string {
  return [item.category, item.post, item.description ?? ''].join(' ')
}

export function budgetLabelByIdMap(
  items: (BudgetItemLike & { id: string })[],
): Map<string, string> {
  const m = new Map<string, string>()
  for (const b of items) {
    m.set(b.id, budgetItemCompactLabel(b))
  }
  return m
}
