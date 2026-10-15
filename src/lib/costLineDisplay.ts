import { formatNok } from './money'
import type { CostEntry, Receipt } from './types'

/** Primært navn på raden: beskrivelse først, deretter leverandør/fallback. */
export function actualLineTitle(
  description: string,
  options?: { vendor?: string; fallback?: string },
): string {
  const desc = description.trim()
  if (desc) return desc
  const vendor = options?.vendor?.trim()
  if (vendor) return vendor
  return options?.fallback ?? 'Kostnad'
}

/** Ekstra tekst på metaraden når tittel allerede bruker beskrivelse (f.eks. leverandør). */
export function actualLineMetaExtra(
  description: string,
  title: string,
  vendor?: string,
): string | null {
  const desc = description.trim()
  const v = vendor?.trim()
  if (!desc || !v) return null
  if (title === desc) return v
  if (title === v) return desc
  return null
}

export function costEntryTitle(entry: CostEntry): string {
  return actualLineTitle(entry.description, { fallback: 'Manuell kostnad' })
}

export function costEntryHoursDetail(entry: CostEntry): string | null {
  if (entry.hours == null || entry.hourly_rate == null) return null
  return `${entry.hours} t × ${formatNok(Number(entry.hourly_rate))}`
}

export function receiptTitle(receipt: Receipt): string {
  return actualLineTitle(receipt.description, {
    vendor: receipt.vendor,
    fallback: 'Kvittering',
  })
}

export function receiptMetaExtra(receipt: Receipt, title: string): string | null {
  return actualLineMetaExtra(
    receipt.description,
    title,
    receipt.vendor,
  )
}
