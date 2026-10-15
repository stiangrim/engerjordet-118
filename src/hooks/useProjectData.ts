import { useCallback, useEffect, useState } from 'react'
import {
  attachActualsToBudgetItems,
  fetchBudgetItems,
  fetchCostEntries,
  fetchCriticalTasks,
  fetchMilestones,
  fetchPayeePayments,
  fetchPayees,
  fetchProject,
  fetchProjectAttachments,
  fetchReceipts,
  fetchSchedulePeriods,
} from '../lib/project'
import { formatLoadError } from '../lib/errors'
import type {
  BudgetItemWithActual,
  CriticalTask,
  Milestone,
  Project,
  CostEntry,
  Payee,
  PayeePayment,
  ProjectAttachment,
  Receipt,
  SchedulePeriod,
} from '../lib/types'

type ProjectData = {
  project: Project
  budgetItems: BudgetItemWithActual[]
  payees: Payee[]
  payeePayments: PayeePayment[]
  costEntries: CostEntry[]
  receipts: Receipt[]
  schedulePeriods: SchedulePeriod[]
  criticalTasks: CriticalTask[]
  milestones: Milestone[]
  projectAttachments: ProjectAttachment[]
}

export function useProjectData() {
  const [data, setData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const project = await fetchProject()
      if (!project) {
        setData(null)
        setError(
          'Fant ikke prosjekt i databasen. Kjør supabase/migrations/001_init.sql i Supabase SQL Editor.',
        )
        return
      }
      const [
        items,
        receipts,
        costEntries,
        payees,
        schedulePeriods,
        criticalTasks,
        milestones,
        projectAttachments,
      ] = await Promise.all([
        fetchBudgetItems(project.id),
        fetchReceipts(project.id),
        fetchCostEntries(project.id),
        fetchPayees(project.id).catch(() => [] as Payee[]),
        fetchSchedulePeriods(project.id),
        fetchCriticalTasks(project.id),
        fetchMilestones(project.id),
        fetchProjectAttachments(project.id).catch(() => [] as ProjectAttachment[]),
      ])
      const payeePayments = await fetchPayeePayments(payees.map((p) => p.id)).catch(
        () => [] as PayeePayment[],
      )
      setData({
        project,
        budgetItems: attachActualsToBudgetItems(items, receipts, costEntries),
        payees,
        payeePayments,
        costEntries,
        receipts,
        schedulePeriods,
        criticalTasks,
        milestones,
        projectAttachments,
      })
    } catch (e) {
      setError(formatLoadError(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload }
}
