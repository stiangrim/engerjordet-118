import {
  costTypeBudgetBucket,
  type ReceiptCostType,
} from './constants'
import { insertWithColumnFallback, updateWithColumnFallback } from './errors'
import { supabase } from './supabase'
import type {
  BudgetItem,
  BudgetItemWithActual,
  CriticalTask,
  Milestone,
  Project,
  CostEntry,
  Payee,
  PayeePayment,
  Receipt,
  SchedulePeriod,
} from './types'

export async function fetchProject(): Promise<Project | null> {
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchBudgetItems(projectId: string): Promise<BudgetItem[]> {
  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchReceipts(projectId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchSchedulePeriods(
  projectId: string,
): Promise<SchedulePeriod[]> {
  const { data, error } = await supabase
    .from('schedule_periods')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchCriticalTasks(
  projectId: string,
): Promise<CriticalTask[]> {
  const { data, error } = await supabase
    .from('critical_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

function sumBucketForItem(
  receipts: Receipt[],
  costEntries: CostEntry[],
  budgetItemId: string,
  bucket: 'materials' | 'labor' | 'other',
): number {
  let total = 0
  for (const r of receipts) {
    if (r.budget_item_id !== budgetItemId) continue
    if (costTypeBudgetBucket(r.cost_type) === bucket) {
      total += Number(r.amount)
    }
  }
  for (const e of costEntries) {
    if (e.budget_item_id !== budgetItemId) continue
    if (costTypeBudgetBucket(e.cost_type) === bucket) {
      total += Number(e.amount)
    }
  }
  return total
}

export function attachActualsToBudgetItems(
  items: BudgetItem[],
  receipts: Receipt[],
  costEntries: CostEntry[] = [],
): BudgetItemWithActual[] {
  return items.map((item) => {
    const actual_materials = sumBucketForItem(
      receipts,
      costEntries,
      item.id,
      'materials',
    )
    const actual_labor = sumBucketForItem(
      receipts,
      costEntries,
      item.id,
      'labor',
    )
    const other = sumBucketForItem(receipts, costEntries, item.id, 'other')
    const actual_total = actual_materials + actual_labor + other
    return {
      ...item,
      actual_materials,
      actual_labor,
      actual_total,
      variance: actual_total - Number(item.budget_total),
    }
  })
}

export function totalActual(
  receipts: Receipt[],
  costEntries: CostEntry[] = [],
): number {
  const r = receipts.reduce((acc, x) => acc + Number(x.amount), 0)
  const e = costEntries.reduce((acc, x) => acc + Number(x.amount), 0)
  return r + e
}

export async function fetchCostEntries(projectId: string): Promise<CostEntry[]> {
  const { data, error } = await supabase
    .from('cost_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export type CostEntryWrite = {
  budget_item_id: string | null
  payee_id?: string | null
  entry_date: string
  cost_type: ReceiptCostType
  amount: number
  hours: number | null
  hourly_rate: number | null
  description: string
  payment_status: string
}

export async function createCostEntry(
  projectId: string,
  input: CostEntryWrite,
): Promise<CostEntry> {
  const { data, error } = await insertWithColumnFallback(
    'cost_entries',
    { ...input, project_id: projectId } as unknown as Record<string, unknown>,
    ['payment_status', 'payee_id'],
  )
  if (error) throw error
  return data as CostEntry
}

export async function updateCostEntry(
  id: string,
  patch: Partial<CostEntryWrite>,
): Promise<CostEntry> {
  const { data, error } = await supabase
    .from('cost_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCostEntry(id: string): Promise<void> {
  const { error } = await supabase.from('cost_entries').delete().eq('id', id)
  if (error) throw error
}

export function groupByCategory(
  items: BudgetItemWithActual[],
): Map<string, BudgetItemWithActual[]> {
  const map = new Map<string, BudgetItemWithActual[]>()
  for (const item of items) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.post.localeCompare(b.post, 'nb'))
  }
  return map
}

/** Kategorier i fase-rekkefølge (laveste sort_order i gruppen først). */
export function budgetCategoriesInOrder(
  items: BudgetItemWithActual[],
): [string, BudgetItemWithActual[]][] {
  const grouped = groupByCategory(items)
  return [...grouped.entries()].sort((a, b) => {
    const minA = Math.min(...a[1].map((i) => i.sort_order))
    const minB = Math.min(...b[1].map((i) => i.sort_order))
    return minA - minB || a[0].localeCompare(b[0], 'nb')
  })
}

export function countByStatus(items: BudgetItem[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.status, (map.get(item.status) ?? 0) + 1)
  }
  return map
}

export async function uploadReceiptFile(
  projectId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('receipts').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export type PayeeWrite = {
  name: string
  extra_owed: number
  notes: string
}

export type PayeePaymentWrite = {
  payee_id: string
  payment_date: string
  amount: number
  method: string
  note: string
}

export async function fetchPayees(projectId: string): Promise<Payee[]> {
  const { data, error } = await supabase
    .from('payees')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createPayee(
  projectId: string,
  input: PayeeWrite,
): Promise<Payee> {
  const { data, error } = await supabase
    .from('payees')
    .insert({ ...input, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePayee(
  id: string,
  patch: Partial<PayeeWrite>,
): Promise<Payee> {
  const { data, error } = await supabase
    .from('payees')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayee(id: string): Promise<void> {
  const { error } = await supabase.from('payees').delete().eq('id', id)
  if (error) throw error
}

export async function fetchPayeePayments(
  payeeIds: string[],
): Promise<PayeePayment[]> {
  if (payeeIds.length === 0) return []
  const { data, error } = await supabase
    .from('payee_payments')
    .select('*')
    .in('payee_id', payeeIds)
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createPayeePayment(
  input: PayeePaymentWrite,
): Promise<PayeePayment> {
  const { data, error } = await supabase
    .from('payee_payments')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePayeePayment(
  id: string,
  patch: Partial<Omit<PayeePaymentWrite, 'payee_id'>>,
): Promise<PayeePayment> {
  const { data, error } = await supabase
    .from('payee_payments')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayeePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payee_payments').delete().eq('id', id)
  if (error) throw error
}

export type CreateReceiptInput = {
  project_id: string
  budget_item_id: string | null
  payee_id?: string | null
  vendor: string
  receipt_date: string | null
  amount: number
  vat_amount: number | null
  cost_type: ReceiptCostType
  description: string
  storage_path: string
  payment_status: string
}

export async function createReceipt(input: CreateReceiptInput): Promise<Receipt> {
  const { data, error } = await insertWithColumnFallback(
    'receipts',
    input as unknown as Record<string, unknown>,
    ['payment_status', 'payee_id'],
  )

  if (error) throw error
  return data as Receipt
}

export async function signedReceiptUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(storagePath, 3600)
  if (error) return null
  return data.signedUrl
}

export type ProjectUpdate = {
  name?: string
  original_budget?: number
  current_budget?: number
  frame_budget?: number
}

export async function updateProject(
  id: string,
  patch: ProjectUpdate,
): Promise<Project> {
  const { data, error } = await supabase
    .from('project')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function syncCurrentBudgetFromItems(
  projectId: string,
): Promise<Project> {
  const items = await fetchBudgetItems(projectId)
  const sum = items.reduce((acc, i) => acc + Number(i.budget_total), 0)
  return updateProject(projectId, { current_budget: sum })
}

export type BudgetItemWrite = {
  category: string
  post: string
  description: string
  budget_materials: number
  budget_labor: number
  budget_total: number
  budget_hours: number | null
  hourly_rate: number | null
  status: string
  comment: string
  sort_order: number
}

export async function createBudgetItem(
  projectId: string,
  input: BudgetItemWrite,
): Promise<BudgetItem> {
  const { data, error } = await supabase
    .from('budget_items')
    .insert({ ...input, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  await syncCurrentBudgetFromItems(projectId)
  return data
}

export async function updateBudgetItem(
  id: string,
  projectId: string,
  patch: Partial<BudgetItemWrite>,
): Promise<BudgetItem> {
  const { data, error } = await supabase
    .from('budget_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await syncCurrentBudgetFromItems(projectId)
  return data
}

export async function deleteBudgetItem(
  id: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase.from('budget_items').delete().eq('id', id)
  if (error) throw error
  await syncCurrentBudgetFromItems(projectId)
}

export type SchedulePeriodWrite = {
  period_label: string
  work_summary: string
  main_focus: string
  highlights: string
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  status: string
  responsible: string
  comment: string
  sort_order: number
}

export async function createSchedulePeriod(
  projectId: string,
  input: SchedulePeriodWrite,
): Promise<SchedulePeriod> {
  const { data, error } = await supabase
    .from('schedule_periods')
    .insert({ ...input, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSchedulePeriod(
  id: string,
  patch: Partial<SchedulePeriodWrite>,
): Promise<SchedulePeriod> {
  const { data, error } = await supabase
    .from('schedule_periods')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedulePeriod(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_periods').delete().eq('id', id)
  if (error) throw error
}

export type CriticalTaskWrite = {
  priority: string
  title: string
  when_label: string
  responsible: string
  status: string
  due_date: string | null
  completed_date: string | null
  comment: string
  sort_order: number
}

export async function createCriticalTask(
  projectId: string,
  input: CriticalTaskWrite,
): Promise<CriticalTask> {
  const { data, error } = await supabase
    .from('critical_tasks')
    .insert({ ...input, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCriticalTask(
  id: string,
  patch: Partial<CriticalTaskWrite>,
): Promise<CriticalTask> {
  const { data, error } = await supabase
    .from('critical_tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCriticalTask(id: string): Promise<void> {
  const { error } = await supabase.from('critical_tasks').delete().eq('id', id)
  if (error) throw error
}

export type MilestoneWrite = {
  title: string
  planned_date: string | null
  actual_date: string | null
  status: string
  dependency: string
  comment: string
  sort_order: number
}

export async function createMilestone(
  projectId: string,
  input: MilestoneWrite,
): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .insert({ ...input, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMilestone(
  id: string,
  patch: Partial<MilestoneWrite>,
): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) throw error
}

export type ReceiptUpdate = {
  budget_item_id?: string | null
  payee_id?: string | null
  vendor?: string
  receipt_date?: string | null
  amount?: number
  vat_amount?: number | null
  cost_type?: ReceiptCostType
  description?: string
  payment_status?: string
}

export async function updateReceipt(
  id: string,
  patch: ReceiptUpdate,
): Promise<Receipt> {
  const { data, error } = await updateWithColumnFallback(
    'receipts',
    id,
    patch as unknown as Record<string, unknown>,
    ['payment_status'],
  )
  if (error) throw error
  return data as Receipt
}

export async function deleteReceipt(receipt: Receipt): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('receipts')
    .remove([receipt.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('receipts').delete().eq('id', receipt.id)
  if (error) throw error
}

export function nextSortOrder(items: { sort_order: number }[]): number {
  if (items.length === 0) return 1
  return Math.max(...items.map((i) => i.sort_order)) + 1
}
