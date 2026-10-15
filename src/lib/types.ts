import type { ReceiptCostType } from './constants'

export type { ReceiptCostType } from './constants'

export type Project = {
  id: string
  name: string
  original_budget: number
  current_budget: number
  frame_budget: number
  created_at: string
}

export type BudgetItem = {
  id: string
  project_id: string
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

export type SchedulePeriod = {
  id: string
  project_id: string
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

export type CriticalTask = {
  id: string
  project_id: string
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

export type Milestone = {
  id: string
  project_id: string
  title: string
  planned_date: string | null
  actual_date: string | null
  status: string
  dependency: string
  comment: string
  sort_order: number
}

export type Receipt = {
  id: string
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
  created_at: string
}

export type Payee = {
  id: string
  project_id: string
  name: string
  /** Beløp utover sum knyttede kostnader/kvitteringer. */
  extra_owed: number
  notes: string
  created_at: string
}

export type PayeePayment = {
  id: string
  payee_id: string
  payment_date: string
  amount: number
  method: string
  note: string
  created_at: string
}

export type CostEntry = {
  id: string
  project_id: string
  budget_item_id: string | null
  payee_id?: string | null
  entry_date: string
  cost_type: ReceiptCostType
  amount: number
  hours: number | null
  hourly_rate: number | null
  description: string
  payment_status: string
  created_at: string
}

export type BudgetItemWithActual = BudgetItem & {
  actual_materials: number
  actual_labor: number
  actual_total: number
  variance: number
}

export type ProjectAttachment = {
  id: string
  project_id: string
  title: string
  description: string
  storage_path: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type AuditLogEntry = {
  id: string
  project_id: string
  actor: string
  role: string
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  created_at: string
}

export type ReceiptParseSuggestion = {
  vendor?: string
  receipt_date?: string
  amount?: number
  vat_amount?: number
  cost_type?: ReceiptCostType
  description?: string
  budget_item_hint?: string
}
