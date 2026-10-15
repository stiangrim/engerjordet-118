import { useEffect, useMemo, useState } from 'react'
import { CanWrite } from '../components/CanWrite'
import { StatCard } from '../components/StatCard'
import { LoadState } from '../components/LoadState'
import { FormActions } from '../components/FormActions'
import { SideSheet } from '../components/SideSheet'
import { useProjectData } from '../hooks/useProjectData'
import { formatNok, parseAmount } from '../lib/money'
import { StatusBadge } from '../components/StatusBadge'
import { PayeeAccountsSection } from '../components/PayeeAccountsSection'
import { budgetLabelByIdMap } from '../lib/budgetItemDisplay'
import {
  countByStatus,
  syncCurrentBudgetFromItems,
  totalActual,
  updateProject,
} from '../lib/project'

export function OverviewPage() {
  const { data, loading, error, reload } = useProjectData()

  return (
    <LoadState loading={loading} error={error} empty={!data} emptyMessage="">
      {data ? (
        <OverviewContent data={data} onChanged={() => void reload()} />
      ) : null}
    </LoadState>
  )
}

function OverviewContent({
  data,
  onChanged,
}: {
  data: NonNullable<ReturnType<typeof useProjectData>['data']>
  onChanged: () => void
}) {
  const { project, budgetItems, payees, payeePayments, receipts, costEntries } =
    data
  const actual = totalActual(receipts, costEntries)
  const remaining = project.frame_budget - actual
  const buffer = project.frame_budget - project.current_budget
  const statusCounts = countByStatus(budgetItems)
  const budgetLabelById = useMemo(
    () => budgetLabelByIdMap(budgetItems),
    [budgetItems],
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const [frame, setFrame] = useState(String(project.frame_budget))
  const [original, setOriginal] = useState(String(project.original_budget))
  const [current, setCurrent] = useState(String(project.current_budget))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFrame(String(project.frame_budget))
    setOriginal(String(project.original_budget))
    setCurrent(String(project.current_budget))
  }, [project])

  async function saveProject() {
    setBusy(true)
    try {
      await updateProject(project.id, {
        frame_budget: parseAmount(frame),
        original_budget: parseAmount(original),
        current_budget: parseAmount(current),
      })
      setSheetOpen(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function syncFromItems() {
    setBusy(true)
    try {
      await syncCurrentBudgetFromItems(project.id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Nøkkeltall</h2>
          <CanWrite>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-50"
            >
              Rediger rammer
            </button>
          </CanWrite>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Prosjektramme"
            value={formatNok(project.frame_budget)}
          />
          <StatCard
            label="Gjeldende budsjett"
            value={formatNok(project.current_budget)}
            hint={`Opprinnelig ${formatNok(project.original_budget)}`}
          />
          <StatCard label="Faktisk registrert" value={formatNok(actual)} />
          <StatCard
            label="Gjenstår av ramme"
            value={formatNok(remaining)}
            hint={remaining < 0 ? 'Over prosjektramme' : undefined}
          />
          <StatCard
            label="Buffer mot ramme"
            value={formatNok(buffer)}
            hint="Differanse budsjett vs ramme"
          />
          <StatCard
            label="Budsjettposter"
            value={String(budgetItems.length)}
            hint={`${statusCounts.get('Ikke startet') ?? 0} ikke startet`}
          />
        </div>
      </section>

      <PayeeAccountsSection
        projectId={project.id}
        payees={payees}
        payeePayments={payeePayments}
        receipts={receipts}
        costEntries={costEntries}
        budgetLabelById={budgetLabelById}
        onChanged={onChanged}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-medium">Status på poster</h3>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {[...statusCounts.entries()].map(([status, count]) => (
            <li key={status} className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-sm text-slate-600 tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </section>

      <SideSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Prosjektinnstillinger"
        description="Rammer og budsjett på prosjektnivå"
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Prosjektramme (kr)</span>
            <input
              className="input mt-1"
              value={frame}
              onChange={(e) => setFrame(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Opprinnelig budsjett (kr)</span>
            <input
              className="input mt-1"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Gjeldende budsjett (kr)</span>
            <input
              className="input mt-1"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncFromItems()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Sett gjeldende budsjett = sum av poster
          </button>
          <FormActions
            busy={busy}
            onSave={() => void saveProject()}
            onCancel={() => setSheetOpen(false)}
          />
        </div>
      </SideSheet>
    </div>
  )
}
