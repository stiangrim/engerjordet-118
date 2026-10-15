import { useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { CanWrite } from '../components/CanWrite'
import { FormActions } from '../components/FormActions'
import { LoadState } from '../components/LoadState'
import { SideSheet } from '../components/SideSheet'
import { StatusBadge } from '../components/StatusBadge'
import { StatusSelect } from '../components/StatusSelect'
import { clickableCardClass, selectedRowClass } from '../lib/rowStyles'
import { useProjectData } from '../hooks/useProjectData'
import {
  createCriticalTask,
  createMilestone,
  createSchedulePeriod,
  deleteCriticalTask,
  deleteMilestone,
  deleteSchedulePeriod,
  nextSortOrder,
  updateCriticalTask,
  updateMilestone,
  updateSchedulePeriod,
} from '../lib/project'
import {
  formatNorwegianDate,
  formatNorwegianDateRange,
} from '../lib/dates'
import type { CriticalTask, Milestone, SchedulePeriod } from '../lib/types'

export function PlanPage() {
  const { data, loading, error, reload } = useProjectData()

  return (
    <LoadState loading={loading} error={error} empty={!data}>
      {data ? (
        <PlanContent
          projectId={data.project.id}
          schedulePeriods={data.schedulePeriods}
          criticalTasks={data.criticalTasks}
          milestones={data.milestones}
          onChanged={() => void reload()}
        />
      ) : null}
    </LoadState>
  )
}

type PlanSheet =
  | { kind: 'period'; mode: 'create' }
  | { kind: 'period'; mode: 'edit'; item: SchedulePeriod }
  | { kind: 'task'; mode: 'create' }
  | { kind: 'task'; mode: 'edit'; item: CriticalTask }
  | { kind: 'milestone'; mode: 'create' }
  | { kind: 'milestone'; mode: 'edit'; item: Milestone }
  | null

function PlanContent({
  projectId,
  schedulePeriods,
  criticalTasks,
  milestones,
  onChanged,
}: {
  projectId: string
  schedulePeriods: SchedulePeriod[]
  criticalTasks: CriticalTask[]
  milestones: Milestone[]
  onChanged: () => void
}) {
  const [sheet, setSheet] = useState<PlanSheet>(null)
  const canWrite = useCanWrite()

  function openSheet(next: NonNullable<PlanSheet>) {
    if (!canWrite) return
    setSheet(next)
  }

  function closeSheet() {
    setSheet(null)
  }

  async function afterSave() {
    closeSheet()
    onChanged()
  }

  const sheetTitle =
    sheet?.kind === 'period'
      ? sheet.mode === 'create'
        ? 'Ny periode'
        : sheet.item.period_label
      : sheet?.kind === 'task'
        ? sheet.mode === 'create'
          ? 'Nytt kritisk punkt'
          : sheet.item.title
        : sheet?.kind === 'milestone'
          ? sheet.mode === 'create'
            ? 'Ny milepæl'
            : sheet.item.title
          : ''

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Fremdriftsplan</h2>
          <CanWrite>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-50"
              onClick={() => openSheet({ kind: 'period', mode: 'create' })}
            >
              Ny periode
            </button>
          </CanWrite>
        </div>
        <ol className="mt-3 space-y-3">
          {schedulePeriods.map((p) => (
            <li
              key={p.id}
              tabIndex={0}
              role="button"
              onClick={() => openSheet({ kind: 'period', mode: 'edit', item: p })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openSheet({ kind: 'period', mode: 'edit', item: p })
                }
              }}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${canWrite ? clickableCardClass : ''} ${selectedRowClass(sheet?.kind === 'period' && sheet.mode === 'edit' && sheet.item.id === p.id)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.period_label}</p>
                  <p className="text-sm text-slate-600">{p.work_summary}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Plan:{' '}
                {formatNorwegianDateRange(p.planned_start, p.planned_end)}
              </p>
              {p.actual_start || p.actual_end ? (
                <p className="mt-1 text-xs text-slate-500">
                  Faktisk:{' '}
                  {formatNorwegianDateRange(p.actual_start, p.actual_end)}
                </p>
              ) : null}
              {p.main_focus ? (
                <p className="mt-2 line-clamp-2 text-sm">{p.main_focus}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Kritiske punkter</h2>
          <CanWrite>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-50"
              onClick={() => openSheet({ kind: 'task', mode: 'create' })}
            >
              Nytt punkt
            </button>
          </CanWrite>
        </div>
        <ul className="mt-3 space-y-2">
          {criticalTasks.map((t) => (
            <li
              key={t.id}
              tabIndex={0}
              role="button"
              onClick={() => openSheet({ kind: 'task', mode: 'edit', item: t })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openSheet({ kind: 'task', mode: 'edit', item: t })
                }
              }}
              className={`rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm ${canWrite ? clickableCardClass : ''} ${selectedRowClass(sheet?.kind === 'task' && sheet.mode === 'edit' && sheet.item.id === t.id)}`}
            >
              <div className="flex flex-wrap gap-2">
                <span className="font-semibold text-red-700">{t.priority}</span>
                <span className="font-medium">{t.title}</span>
              </div>
              <p className="mt-1 text-slate-600">
                {t.when_label}
                {t.due_date
                  ? ` · frist ${formatNorwegianDate(t.due_date)}`
                  : ''}
                {t.completed_date
                  ? ` · ferdig ${formatNorwegianDate(t.completed_date)}`
                  : ''}
              </p>
              <div className="mt-1">
                <StatusBadge status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Milepæler</h2>
          <CanWrite>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-50"
              onClick={() => openSheet({ kind: 'milestone', mode: 'create' })}
            >
              Ny milepæl
            </button>
          </CanWrite>
        </div>
        <ul className="mt-3 space-y-2">
          {milestones.map((m) => (
            <li
              key={m.id}
              tabIndex={0}
              role="button"
              onClick={() =>
                openSheet({ kind: 'milestone', mode: 'edit', item: m })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openSheet({ kind: 'milestone', mode: 'edit', item: m })
                }
              }}
              className={`rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm ${canWrite ? clickableCardClass : ''} ${selectedRowClass(sheet?.kind === 'milestone' && sheet.mode === 'edit' && sheet.item.id === m.id)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-slate-500 line-clamp-1">
                    {m.dependency}
                    {m.comment ? ` · ${m.comment}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-slate-600">
                  <p className="text-right text-sm">
                    {m.planned_date ? (
                      <>
                        <span className="block text-slate-500">Plan</span>
                        {formatNorwegianDate(m.planned_date)}
                      </>
                    ) : null}
                    {m.actual_date ? (
                      <>
                        <span className="mt-1 block text-slate-500">Faktisk</span>
                        {formatNorwegianDate(m.actual_date)}
                      </>
                    ) : null}
                    {!m.planned_date && !m.actual_date ? '—' : null}
                  </p>
                  <StatusBadge status={m.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SideSheet open={sheet !== null} onClose={closeSheet} title={sheetTitle}>
        {sheet?.kind === 'period' && sheet.mode === 'create' ? (
          <SchedulePeriodForm
            onCancel={closeSheet}
            onSave={async (values) => {
              await createSchedulePeriod(projectId, {
                ...values,
                sort_order: nextSortOrder(schedulePeriods),
              })
              await afterSave()
            }}
          />
        ) : null}
        {sheet?.kind === 'period' && sheet.mode === 'edit' ? (
          <SchedulePeriodForm
            key={sheet.item.id}
            initial={sheet.item}
            onCancel={closeSheet}
            onSave={async (values) => {
              await updateSchedulePeriod(sheet.item.id, values)
              await afterSave()
            }}
            onDelete={async () => {
              await deleteSchedulePeriod(sheet.item.id)
              await afterSave()
            }}
          />
        ) : null}
        {sheet?.kind === 'task' && sheet.mode === 'create' ? (
          <CriticalTaskForm
            onCancel={closeSheet}
            onSave={async (values) => {
              await createCriticalTask(projectId, {
                ...values,
                sort_order: nextSortOrder(criticalTasks),
              })
              await afterSave()
            }}
          />
        ) : null}
        {sheet?.kind === 'task' && sheet.mode === 'edit' ? (
          <CriticalTaskForm
            key={sheet.item.id}
            initial={sheet.item}
            onCancel={closeSheet}
            onSave={async (values) => {
              await updateCriticalTask(sheet.item.id, values)
              await afterSave()
            }}
            onDelete={async () => {
              await deleteCriticalTask(sheet.item.id)
              await afterSave()
            }}
          />
        ) : null}
        {sheet?.kind === 'milestone' && sheet.mode === 'create' ? (
          <MilestoneForm
            onCancel={closeSheet}
            onSave={async (values) => {
              await createMilestone(projectId, {
                ...values,
                sort_order: nextSortOrder(milestones),
              })
              await afterSave()
            }}
          />
        ) : null}
        {sheet?.kind === 'milestone' && sheet.mode === 'edit' ? (
          <MilestoneForm
            key={sheet.item.id}
            initial={sheet.item}
            onCancel={closeSheet}
            onSave={async (values) => {
              await updateMilestone(sheet.item.id, values)
              await afterSave()
            }}
            onDelete={async () => {
              await deleteMilestone(sheet.item.id)
              await afterSave()
            }}
          />
        ) : null}
      </SideSheet>
    </div>
  )
}

function SchedulePeriodForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: SchedulePeriod
  onSave: (v: import('../lib/project').SchedulePeriodWrite) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [periodLabel, setPeriodLabel] = useState(initial?.period_label ?? '')
  const [workSummary, setWorkSummary] = useState(initial?.work_summary ?? '')
  const [mainFocus, setMainFocus] = useState(initial?.main_focus ?? '')
  const [highlights, setHighlights] = useState(initial?.highlights ?? '')
  const [plannedStart, setPlannedStart] = useState(initial?.planned_start ?? '')
  const [plannedEnd, setPlannedEnd] = useState(initial?.planned_end ?? '')
  const [actualStart, setActualStart] = useState(initial?.actual_start ?? '')
  const [actualEnd, setActualEnd] = useState(initial?.actual_end ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'Ikke startet')
  const [responsible, setResponsible] = useState(initial?.responsible ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSave({
        period_label: periodLabel,
        work_summary: workSummary,
        main_focus: mainFocus,
        highlights,
        planned_start: plannedStart || null,
        planned_end: plannedEnd || null,
        actual_start: actualStart || null,
        actual_end: actualEnd || null,
        status,
        responsible,
        comment,
        sort_order: initial?.sort_order ?? 0,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <input className="input" placeholder="Periode" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
      <input className="input" placeholder="Arbeid" value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} />
      <textarea className="input" rows={2} placeholder="Hovedfokus" value={mainFocus} onChange={(e) => setMainFocus(e.target.value)} />
      <textarea className="input" rows={3} placeholder="Huspunkter" value={highlights} onChange={(e) => setHighlights(e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label>Plan start <input type="date" className="input mt-1" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} /></label>
        <label>Plan slutt <input type="date" className="input mt-1" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} /></label>
        <label>Faktisk start <input type="date" className="input mt-1" value={actualStart} onChange={(e) => setActualStart(e.target.value)} /></label>
        <label>Faktisk slutt <input type="date" className="input mt-1" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} /></label>
      </div>
      <StatusSelect value={status} onChange={setStatus} />
      <input className="input" placeholder="Ansvarlig" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
      <textarea className="input" rows={2} placeholder="Kommentar" value={comment} onChange={(e) => setComment(e.target.value)} />
      <FormActions busy={busy} onSave={() => void save()} onCancel={onCancel} onDelete={onDelete ? () => void onDelete() : undefined} />
    </div>
  )
}

function CriticalTaskForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: CriticalTask
  onSave: (v: import('../lib/project').CriticalTaskWrite) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [priority, setPriority] = useState(initial?.priority ?? 'Høy')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [whenLabel, setWhenLabel] = useState(initial?.when_label ?? '')
  const [responsible, setResponsible] = useState(initial?.responsible ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'Ikke startet')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [completedDate, setCompletedDate] = useState(initial?.completed_date ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSave({
        priority,
        title,
        when_label: whenLabel,
        responsible,
        status,
        due_date: dueDate || null,
        completed_date: completedDate || null,
        comment,
        sort_order: initial?.sort_order ?? 0,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input className="input" placeholder="Prioritet" value={priority} onChange={(e) => setPriority(e.target.value)} />
      <input className="input" placeholder="Oppgave" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="input" placeholder="Når" value={whenLabel} onChange={(e) => setWhenLabel(e.target.value)} />
      <input className="input" placeholder="Ansvarlig" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
      <StatusSelect value={status} onChange={setStatus} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label>Frist <input type="date" className="input mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        <label>Ferdig <input type="date" className="input mt-1" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} /></label>
      </div>
      <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      <FormActions busy={busy} onSave={() => void save()} onCancel={onCancel} onDelete={onDelete ? () => void onDelete() : undefined} />
    </div>
  )
}

function MilestoneForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Milestone
  onSave: (v: import('../lib/project').MilestoneWrite) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [plannedDate, setPlannedDate] = useState(initial?.planned_date ?? '')
  const [actualDate, setActualDate] = useState(initial?.actual_date ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'Ikke startet')
  const [dependency, setDependency] = useState(initial?.dependency ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await onSave({
        title,
        planned_date: plannedDate || null,
        actual_date: actualDate || null,
        status,
        dependency,
        comment,
        sort_order: initial?.sort_order ?? 0,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <input className="input" placeholder="Milepæl" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label>Plan <input type="date" className="input mt-1" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} /></label>
        <label>Faktisk <input type="date" className="input mt-1" value={actualDate} onChange={(e) => setActualDate(e.target.value)} /></label>
      </div>
      <StatusSelect value={status} onChange={setStatus} />
      <input className="input" placeholder="Avhengighet" value={dependency} onChange={(e) => setDependency(e.target.value)} />
      <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      <FormActions busy={busy} onSave={() => void save()} onCancel={onCancel} onDelete={onDelete ? () => void onDelete() : undefined} />
    </div>
  )
}
