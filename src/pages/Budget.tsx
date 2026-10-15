import { Fragment, useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { CanWrite } from '../components/CanWrite'
import { BudgetItemForm } from '../components/BudgetItemForm'
import { LoadState } from '../components/LoadState'
import { SideSheet } from '../components/SideSheet'
import { useProjectData } from '../hooks/useProjectData'
import { formatNok } from '../lib/money'
import {
  createBudgetItem,
  deleteBudgetItem,
  budgetCategoriesInOrder,
  nextSortOrder,
  updateBudgetItem,
} from '../lib/project'
import { clickableRowClass, selectedRowClass } from '../lib/rowStyles'
import { varianceTextClass } from '../lib/variance'
import { BudgetItemActualsPanel } from '../components/BudgetItemActualsPanel'
import { StatusBadge } from '../components/StatusBadge'
import type { BudgetItemWithActual, CostEntry, Payee, Receipt } from '../lib/types'

type SheetState =
  | { mode: 'create' }
  | { mode: 'edit'; item: BudgetItemWithActual }
  | null

export function BudgetPage() {
  const { data, loading, error, reload } = useProjectData()
  const [sheet, setSheet] = useState<SheetState>(null)

  return (
    <LoadState loading={loading} error={error} empty={!data}>
      {data ? (
        <BudgetContent
          projectId={data.project.id}
          items={data.budgetItems}
          receipts={data.receipts}
          costEntries={data.costEntries}
          payees={data.payees}
          sheet={sheet}
          setSheet={setSheet}
          onChanged={() => void reload()}
        />
      ) : null}
    </LoadState>
  )
}

function BudgetContent({
  projectId,
  items,
  receipts,
  costEntries,
  payees,
  sheet,
  setSheet,
  onChanged,
}: {
  projectId: string
  items: BudgetItemWithActual[]
  receipts: Receipt[]
  costEntries: CostEntry[]
  payees: Payee[]
  sheet: SheetState
  setSheet: (s: SheetState) => void
  onChanged: () => void
}) {
  const grouped = budgetCategoriesInOrder(items)
  const totals = items.reduce(
    (acc, i) => ({
      budget: acc.budget + Number(i.budget_total),
      actual: acc.actual + i.actual_total,
    }),
    { budget: 0, actual: 0 },
  )

  const canWrite = useCanWrite()
  const selectedId = sheet?.mode === 'edit' ? sheet.item.id : null

  function openRow(item: BudgetItemWithActual) {
    if (!canWrite) return
    setSheet({ mode: 'edit', item })
  }

  function closeSheet() {
    setSheet(null)
  }

  async function afterSave() {
    closeSheet()
    onChanged()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Budsjett</h2>
          <p className="text-sm text-slate-600">
            Sum budsjett {formatNok(totals.budget)} · Faktisk{' '}
            {formatNok(totals.actual)} · Avvik{' '}
            <span className={varianceTextClass(totals.actual - totals.budget)}>
              {formatNok(totals.actual - totals.budget)}
            </span>
          </p>
        </div>
        <CanWrite>
          <button
            type="button"
            onClick={() => setSheet({ mode: 'create' })}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Ny budsjettpost
          </button>
        </CanWrite>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="budget-table w-full min-w-[44rem] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 text-left">Post</th>
                <th className="px-4 py-3 text-right">Budsjett</th>
                <th className="px-4 py-3 text-right">Faktisk</th>
                <th className="px-4 py-3 text-right">Avvik</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([category, rows]) => (
                <Fragment key={category}>
                  <tr className="pointer-events-none select-none">
                    <td
                      colSpan={5}
                      className="border-y border-slate-200 border-l-4 border-l-slate-400 bg-slate-100/80 px-4 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          {category}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {rows.length}{' '}
                          {rows.length === 1 ? 'post' : 'poster'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => openRow(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openRow(row)
                        }
                      }}
                      className={`bg-white border-t border-slate-100 ${canWrite ? clickableRowClass : ''} ${selectedRowClass(selectedId === row.id)}`}
                    >
                      <td className="px-4 py-2.5 align-top">
                        <p className="font-medium">{row.post}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {row.description}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums align-top">
                        {formatNok(Number(row.budget_total))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums align-top">
                        {formatNok(row.actual_total)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums align-top ${varianceTextClass(row.variance)}`}
                      >
                        {formatNok(row.variance)}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SideSheet
        open={sheet !== null}
        onClose={closeSheet}
        title={
          sheet?.mode === 'create'
            ? 'Ny budsjettpost'
            : sheet?.mode === 'edit'
              ? sheet.item.post
              : ''
        }
        description={
          sheet?.mode === 'edit' ? sheet.item.category : undefined
        }
      >
        {sheet?.mode === 'create' ? (
          <BudgetItemForm
            onCancel={closeSheet}
            onSave={async (values) => {
              await createBudgetItem(projectId, {
                ...values,
                sort_order: nextSortOrder(items),
              })
              await afterSave()
            }}
          />
        ) : null}
        {sheet?.mode === 'edit' ? (
          <div className="space-y-4">
            <BudgetItemForm
              key={sheet.item.id}
              initial={sheet.item}
              onCancel={closeSheet}
              onSave={async (values) => {
                await updateBudgetItem(sheet.item.id, projectId, values)
                await afterSave()
              }}
              onDelete={async () => {
                await deleteBudgetItem(sheet.item.id, projectId)
                await afterSave()
              }}
            />
            <BudgetItemActualsPanel
              projectId={projectId}
              budgetItemId={sheet.item.id}
              budgetItems={items}
              costEntries={costEntries}
              receipts={receipts}
              payees={payees}
              onChanged={onChanged}
            />
          </div>
        ) : null}
      </SideSheet>
    </div>
  )
}
