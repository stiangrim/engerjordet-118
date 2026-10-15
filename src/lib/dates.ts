/** yyyy-mm-dd i lokal tid (for type="date"). */
export function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIsoDate(): string {
  return toIsoDateLocal(new Date())
}

/** ISO-dato (yyyy-mm-dd) → Date uten tidssone-glipp. */
export function parseIsoDate(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T12:00:00')
}

const longDateFormatter = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const mediumDateFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function capitalizeFirst(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Visning: «Torsdag 1. september 2026» */
export function formatNorwegianDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  return capitalizeFirst(longDateFormatter.format(parseIsoDate(iso)))
}

/** Kompakt visning uten ukedag (f.eks. i sidepanel-tittel). */
export function formatNorwegianDateMedium(
  iso: string | null | undefined,
): string {
  if (!iso?.trim()) return '—'
  return mediumDateFormatter.format(parseIsoDate(iso))
}

export function formatNorwegianDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start?.trim() && !end?.trim()) return '—'
  if (start?.trim() && end?.trim() && start !== end) {
    return `${formatNorwegianDateMedium(start)} – ${formatNorwegianDateMedium(end)}`
  }
  return formatNorwegianDateMedium(start ?? end)
}
