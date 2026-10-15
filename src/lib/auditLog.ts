import { getAuditSession, notifyAuditLogUpdated } from './auditSession'
import { supabase } from './supabase'
import type { AuditLogEntry } from './types'

export type AuditAction = 'create' | 'update' | 'delete'

export async function recordAudit(params: {
  projectId: string
  action: AuditAction
  entityType: string
  entityId?: string | null
  summary: string
}): Promise<void> {
  const audit = getAuditSession()
  if (!audit || audit.role !== 'full') return

  const { error } = await supabase.from('audit_log').insert({
    project_id: params.projectId,
    actor: audit.actor,
    role: audit.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    summary: params.summary,
  })
  if (!error) notifyAuditLogUpdated()
}

export async function fetchAuditLog(
  projectId: string,
  limit = 40,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
