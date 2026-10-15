import type { ReactNode } from 'react'
import { formatNok } from '../lib/money'
import {
  CalendarIcon,
  ClipboardIcon,
  ClockIcon,
  FolderIcon,
  ReceiptIcon,
  StoreIcon,
  UserIcon,
  costTypeIcon,
} from './icons'
import { MetaLine } from './MetaLine'

export type CostLineSummaryProps = {
  title: string
  amount: number
  dateLabel: string
  costType: string
  costTypeLabel: string
  /** «Kvittering» eller «Manuell» */
  recordKind?: 'receipt' | 'cost'
  budgetLabel?: string
  hoursDetail?: string | null
  /** Leverandør eller annen sekundærtekst */
  vendorOrExtra?: string | null
  /** Mottaker-navn i stedet for betalingsknapp */
  payeeName?: string | null
  footer?: ReactNode
  dense?: boolean
}

export function CostLineSummary({
  title,
  amount,
  dateLabel,
  costType,
  costTypeLabel,
  recordKind,
  budgetLabel,
  hoursDetail,
  vendorOrExtra,
  payeeName,
  footer,
  dense,
}: CostLineSummaryProps) {
  const CategoryIcon = costTypeIcon(costType)
  const amountClass = dense
    ? 'text-sm font-semibold tabular-nums text-slate-900'
    : 'text-base font-semibold tabular-nums text-slate-900'
  const metaSize = dense ? 'text-xs' : 'text-sm'

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="font-medium leading-snug text-slate-900">{title}</p>
      <p className={amountClass}>{formatNok(amount)}</p>

      <div className={`space-y-1 ${metaSize}`}>
        <MetaLine icon={CalendarIcon}>{dateLabel}</MetaLine>
        <MetaLine icon={CategoryIcon}>{costTypeLabel}</MetaLine>
        {recordKind ? (
          <MetaLine
            icon={recordKind === 'receipt' ? ReceiptIcon : ClipboardIcon}
          >
            {recordKind === 'receipt' ? 'Kvittering' : 'Manuell registrering'}
          </MetaLine>
        ) : null}
        {budgetLabel ? (
          <MetaLine icon={FolderIcon}>{budgetLabel}</MetaLine>
        ) : null}
        {hoursDetail ? (
          <MetaLine icon={ClockIcon}>{hoursDetail}</MetaLine>
        ) : null}
        {vendorOrExtra ? (
          <MetaLine icon={StoreIcon}>{vendorOrExtra}</MetaLine>
        ) : null}
        {payeeName ? (
          <MetaLine icon={UserIcon}>{payeeName}</MetaLine>
        ) : null}
      </div>

      {footer ? <div className="pt-1">{footer}</div> : null}
    </div>
  )
}
