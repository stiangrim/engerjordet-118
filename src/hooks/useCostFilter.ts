import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  COST_SORT_LABELS,
  EMPTY_COST_FILTER,
  type CostFilter,
  type CostSort,
} from '../lib/costSearch'

const PARAM: Record<keyof CostFilter, string> = {
  query: 'q',
  budgetItemId: 'post',
  costType: 'type',
  paymentStatus: 'betaling',
  sort: 'sort',
}

/** Cost filter kept in the URL, so a search survives reloads and can be linked. */
export function useCostFilter(): [CostFilter, (next: Partial<CostFilter>) => void] {
  const [params, setParams] = useSearchParams()

  const filter = useMemo((): CostFilter => {
    const sort = params.get(PARAM.sort) ?? ''
    return {
      query: params.get(PARAM.query) ?? '',
      budgetItemId: params.get(PARAM.budgetItemId) ?? '',
      costType: params.get(PARAM.costType) ?? '',
      paymentStatus: params.get(PARAM.paymentStatus) ?? '',
      sort: sort in COST_SORT_LABELS ? (sort as CostSort) : EMPTY_COST_FILTER.sort,
    }
  }, [params])

  const update = useCallback(
    (next: Partial<CostFilter>) => {
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(next) as [keyof CostFilter, string][]) {
            if (!value || value === EMPTY_COST_FILTER[key]) out.delete(PARAM[key])
            else out.set(PARAM[key], value)
          }
          return out
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return [filter, update]
}
