import { useMemo } from 'react'
import { ITEM_STATUSES } from '../lib/constants'
import { SearchableSelect } from './SearchableSelect'

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function StatusSelect({ value, onChange, className = 'input' }: Props) {
  const options = useMemo(() => {
    const base = ITEM_STATUSES.map((s) => ({ value: s, label: s }))
    if (
      value &&
      !ITEM_STATUSES.includes(value as (typeof ITEM_STATUSES)[number])
    ) {
      return [...base, { value, label: value }]
    }
    return base
  }, [value])

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      className={className}
      searchPlaceholder="Søk status …"
    />
  )
}
