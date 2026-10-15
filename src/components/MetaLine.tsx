import type { ComponentType, ReactNode } from 'react'

type IconComponent = ComponentType<{ className?: string }>

type Props = {
  icon: IconComponent
  children: ReactNode
  className?: string
  iconClassName?: string
}

export function MetaLine({
  icon: Icon,
  children,
  className = '',
  iconClassName = 'text-slate-400',
}: Props) {
  return (
    <div
      className={`flex items-start gap-2 text-slate-600 ${className}`.trim()}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClassName}`.trim()} />
      <span className="min-w-0 leading-snug">{children}</span>
    </div>
  )
}
