/** Avvik = faktisk − budsjett. Negativt = under budsjett (bra), positivt = over (dårlig). */
export function varianceTextClass(variance: number): string {
  if (variance > 0) return 'text-red-600'
  if (variance < 0) return 'text-emerald-700'
  return 'text-slate-700'
}
