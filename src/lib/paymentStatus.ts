import type { PaymentStatus } from './constants'

export function normalizePaymentStatus(raw: string | null | undefined): PaymentStatus {
  if (raw === 'Betalt') return 'Betalt'
  return 'Ikke betalt'
}

export function paymentStatusBadgeClass(status: string): string {
  switch (normalizePaymentStatus(status)) {
    case 'Betalt':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100'
    case 'Ikke betalt':
      return 'bg-red-50 text-red-800 ring-red-200 hover:bg-red-100'
  }
}
