type PostgrestLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export function formatSupabaseError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as PostgrestLike
    const msg = e.message ?? 'Kunne ikke lagre'

    if (msg.includes('payment_status')) {
      return 'Kolonnen payment_status finnes ikke ennå. Kjør supabase/migrations/003_payment_status.sql (og 004) i Supabase SQL Editor, eller oppdater appen etter migrasjon.'
    }
    if (
      msg.includes('invalid input value for enum') &&
      msg.includes('receipt_cost_type')
    ) {
      return 'Kostnadstypen finnes ikke i databasen. Kjør supabase/migrations/005_receipt_cost_types.sql i Supabase SQL Editor.'
    }
    if (msg.includes("Could not find the table 'public.cost_entries'")) {
      return 'Tabellen cost_entries mangler. Kjør supabase/migrations/002_cost_entries.sql i Supabase SQL Editor.'
    }
    if (e.details) return `${msg} (${e.details})`
    if (e.hint) return `${msg} — ${e.hint}`
    return msg
  }
  return 'Kunne ikke lagre'
}

function isMissingColumnError(error: PostgrestLike, column: string): boolean {
  const msg = error.message ?? ''
  return (
    error.code === 'PGRST204' ||
    (msg.includes(column) &&
      (msg.includes('schema cache') || msg.includes('Could not find')))
  )
}

/** Fjern kolonner som ikke finnes i eldre databaser (én retry). */
export async function insertWithColumnFallback<T extends Record<string, unknown>>(
  table: 'receipts' | 'cost_entries',
  row: T,
  optionalColumns: (keyof T)[],
): Promise<{ data: unknown; error: PostgrestLike | null }> {
  const { supabase } = await import('./supabase')
  let payload: Record<string, unknown> = { ...row }
  let result = await supabase.from(table).insert(payload).select().single()

  if (result.error) {
    for (const col of optionalColumns) {
      if (!isMissingColumnError(result.error, String(col))) continue
      const next = { ...payload }
      delete next[col as string]
      payload = next
      result = await supabase.from(table).insert(payload).select().single()
      if (!result.error) break
    }
  }

  return { data: result.data, error: result.error }
}

export async function updateWithColumnFallback<T extends Record<string, unknown>>(
  table: 'receipts' | 'cost_entries',
  id: string,
  patch: T,
  optionalColumns: (keyof T)[],
): Promise<{ data: unknown; error: PostgrestLike | null }> {
  const { supabase } = await import('./supabase')
  let payload: Record<string, unknown> = { ...patch }
  let result = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (result.error) {
    for (const col of optionalColumns) {
      if (!isMissingColumnError(result.error, String(col))) continue
      const next = { ...payload }
      delete next[col as string]
      if (Object.keys(next).length === 0) {
        return { data: null, error: result.error }
      }
      payload = next
      result = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (!result.error) break
    }
  }

  return { data: result.data, error: result.error }
}

export function formatLoadError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    if (message.includes("Could not find the table 'public.project'")) {
      return 'Databasen er ikke satt opp ennå. Åpne Supabase SQL Editor og kjør hele filen supabase/migrations/001_init.sql (se README).'
    }
    if (message.includes("Could not find the table 'public.cost_entries'")) {
      return 'Tabellen cost_entries mangler. Kjør supabase/migrations/002_cost_entries.sql i Supabase SQL Editor.'
    }
    return message
  }
  return 'Kunne ikke laste data'
}
