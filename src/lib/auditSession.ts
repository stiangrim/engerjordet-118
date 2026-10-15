import type { AccessRole } from '../access/accessConfig'

export type AuditSession = {
  actor: string
  role: Exclude<AccessRole, 'none'>
}

let session: AuditSession | null = null

export function setAuditSession(next: AuditSession | null): void {
  session = next
}

export function getAuditSession(): AuditSession | null {
  return session
}

export function notifyAuditLogUpdated(): void {
  window.dispatchEvent(new CustomEvent('audit-log-updated'))
}
