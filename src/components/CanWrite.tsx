import type { ReactNode } from 'react'
import { useCanWrite } from '../access/AccessContext'

export function CanWrite({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const canWrite = useCanWrite()
  if (!canWrite) return fallback
  return children
}
