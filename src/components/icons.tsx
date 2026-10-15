import type { ComponentType, ReactNode } from 'react'
import type { ReceiptCostType } from '../lib/constants'
import { RECEIPT_COST_TYPES } from '../lib/constants'

type IconProps = { className?: string; title?: string }

function Svg({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-4 w-4'}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </Svg>
  )
}

export function TagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l6.6-6.6a1 1 0 0 0 0-1.4L12 2z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 7a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />
    </Svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function StoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9 5 3h14l2 6M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18" />
      <path d="M9 21V12h6v9" />
    </Svg>
  )
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </Svg>
  )
}

export function ClipboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </Svg>
  )
}

export function PackageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </Svg>
  )
}

export function WrenchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-3.3-3.3 2.1-2.1z" />
    </Svg>
  )
}

export function TruckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 17h4M2 10h12v7H2zM12 10h4l3 4v3h-7V10z" />
      <circle cx="6.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 19v-1a3 3 0 0 0-2-2.8M16 4a3 3 0 0 1 0 6" />
    </Svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
    </Svg>
  )
}

const COST_TYPE_ICON: Record<
  ReceiptCostType,
  ComponentType<IconProps>
> = {
  materials: PackageIcon,
  tools: WrenchIcon,
  equipment_rental: WrenchIcon,
  transport: TruckIcon,
  subcontractor: UsersIcon,
  fees: TagIcon,
  waste: PackageIcon,
  other: TagIcon,
}

export function costTypeIcon(
  type: string,
): ComponentType<IconProps> {
  const key = type === 'labor' ? 'subcontractor' : type
  if ((RECEIPT_COST_TYPES as readonly string[]).includes(key)) {
    return COST_TYPE_ICON[key as ReceiptCostType]
  }
  return TagIcon
}
