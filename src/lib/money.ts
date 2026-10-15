const nok = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
})

export function formatNok(value: number): string {
  return nok.format(value)
}

export function parseAmount(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}
