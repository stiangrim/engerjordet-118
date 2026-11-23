import { useMemo } from 'react'
import { PAYMENT_STATUSES } from '../lib/constants'
import {
  COST_SORT_LABELS,
  EMPTY_COST_FILTER,
  NO_BUDGET_ITEM,
  isCostFilterActive,
  type CostFilter,
  type CostSort,
} from '../lib/costSearch'
import { formatNok } from '../lib/money'
import { budgetItemOptions, receiptCostTypeOptions } from '../lib/selectOptions'
import type { BudgetItemLike } from '../lib/budgetItemDisplay'
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect'

type Props = {
  filter: CostFilter
  onChange: (next: Partial<CostFilter>) => void
  budgetItems: (BudgetItemLike & { id: string })[]
  shown: number
  total: number
  shownSum: number
  onExport?: () => void
}

export function CostFilterBar({
  filter,
  onChange,
  budgetItems,
  shown,
  total,
  shownSum,
  onExport,
}: Props) {
  const budgetOptions = useMemo(
    (): SearchableSelectOption[] => [
      { value: NO_BUDGET_ITEM, label: 'Uten budsjettpost' },
      ...budgetItemOptions(budgetItems),
    ],
    [budgetItems],
  )
  const typeOptions = useMemo(() => receiptCostTypeOptions(), [])
  const paymentOptions = useMemo(
    () => PAYMENT_STATUSES.map((s) => ({ value: s, label: s })),
    [],
  )
  const sortOptions = useMemo(
    () =>
      (Object.keys(COST_SORT_LABELS) as CostSort[]).map((k) => ({
        value: k,
        label: COST_SORT_LABELS[k],
      })),
    [],
  )
  const active = isCostFilterActive(filter)

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="relative">
        <input
          type="search"
          className="input pr-9"
          placeholder="Søk i leverandør, beskrivelse, beløp, dato, budsjettpost …"
          aria-label="Søk i kostnader"
          value={filter.query}
          onChange={(e) => onChange({ query: e.target.value })}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <SearchableSelect
          value={filter.budgetItemId}
          onChange={(v) => onChange({ budgetItemId: v })}
          options={budgetOptions}
          allowEmpty
          emptyLabel="Alle budsjettposter"
          searchPlaceholder="Søk budsjettpost …"
        />
        <SearchableSelect
          value={filter.costType}
          onChange={(v) => onChange({ costType: v })}
          options={typeOptions}
          allowEmpty
          emptyLabel="Alle typer"
          searchPlaceholder="Søk type …"
        />
        <SearchableSelect
          value={filter.paymentStatus}
          onChange={(v) => onChange({ paymentStatus: v })}
          options={paymentOptions}
          allowEmpty
          emptyLabel="Alle betalinger"
        />
        <SearchableSelect
          value={filter.sort}
          onChange={(v) => onChange({ sort: (v || EMPTY_COST_FILTER.sort) as CostSort })}
          options={sortOptions}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-600" aria-live="polite">
          {active ? (
            <>
              Viser <span className="font-medium text-slate-900">{shown}</span> av {total}
              {' · '}
            </>
          ) : (
            <>{total} poster · </>
          )}
          <span className="font-medium tabular-nums text-slate-900">{formatNok(shownSum)}</span>
        </p>
        <div className="flex gap-2">
          {active ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  query: '',
                  budgetItemId: '',
                  costType: '',
                  paymentStatus: '',
                })
              }
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Nullstill filtre
            </button>
          ) : null}
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              disabled={shown === 0}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Last ned CSV
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
