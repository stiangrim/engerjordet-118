import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export type SearchableSelectOption = {
  value: string
  label: string
  /** Second line (e.g. budsjettbeskrivelse). */
  subLabel?: string
  /** Gruppeoverskrift i listen (e.g. budsjettkategori). */
  group?: string
  /** Extra text matched by search. */
  keywords?: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  className?: string
  disabled?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
  searchPlaceholder?: string
  id?: string
}

function optionSearchText(o: SearchableSelectOption): string {
  return `${o.label} ${o.subLabel ?? ''} ${o.group ?? ''} ${o.keywords ?? ''}`.toLowerCase()
}

function matchesQuery(o: SearchableSelectOption, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return optionSearchText(o).includes(q)
}

export function SearchableSelect({
  value,
  onChange,
  options,
  className = 'input',
  disabled = false,
  allowEmpty = false,
  emptyLabel = '—',
  searchPlaceholder = 'Søk …',
  id: idProp,
}: Props) {
  const autoId = useId()
  const id = idProp ?? autoId
  const listId = `${id}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null)

  const selectedOption = useMemo(() => {
    if (allowEmpty && value === '') return null
    return options.find((o) => o.value === value) ?? null
  }, [allowEmpty, value, options])

  const useGroupHeaders = useMemo(
    () => options.some((o) => o.value !== '' && o.group),
    [options],
  )

  const visibleOptions = useMemo(() => {
    const filtered = options.filter((o) => matchesQuery(o, query))
    if (!allowEmpty) return filtered
    const emptyOpt: SearchableSelectOption = { value: '', label: emptyLabel }
    if (!matchesQuery(emptyOpt, query)) return filtered
    return [emptyOpt, ...filtered]
  }, [allowEmpty, emptyLabel, options, query])

  const showSearch = options.length > 3 || allowEmpty

  const reposition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    setPanelRect(el.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!open) return
    reposition()
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      const panel = document.getElementById(listId)
      if (panel?.contains(t)) return
      setOpen(false)
      setQuery('')
    }
    function onScroll() {
      reposition()
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [listId, open, reposition])

  useEffect(() => {
    if (open && showSearch) {
      searchRef.current?.focus()
    }
  }, [open, showSearch])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function pick(next: string) {
    onChange(next)
    close()
  }

  function openList() {
    if (disabled) return
    setOpen(true)
    requestAnimationFrame(reposition)
  }

  const panel =
    open && panelRect ? (
      <div
        id={listId}
        role="presentation"
        className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        style={{
          position: 'fixed',
          top: panelRect.bottom + 4,
          left: panelRect.left,
          width: panelRect.width,
          zIndex: 80,
        }}
      >
        {showSearch ? (
          <div className="border-b border-slate-100 px-2 pb-2 pt-1">
            <input
              ref={searchRef}
              type="search"
              className="input py-1.5 text-sm"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  close()
                }
                if (e.key === 'Enter' && visibleOptions.length > 0) {
                  e.preventDefault()
                  pick(visibleOptions[0].value)
                }
              }}
            />
          </div>
        ) : null}
        <ul role="listbox" aria-labelledby={id} className="max-h-60 overflow-y-auto py-1">
          {visibleOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Ingen treff</li>
          ) : (
            (() => {
              let lastGroup: string | undefined
              return visibleOptions.flatMap((o) => {
                const selected = o.value === value
                const nodes: ReactNode[] = []
                if (
                  useGroupHeaders &&
                  o.group &&
                  o.value !== '' &&
                  o.group !== lastGroup
                ) {
                  lastGroup = o.group
                  nodes.push(
                    <li
                      key={`group-${o.group}-${o.value}`}
                      className="sticky top-0 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      aria-hidden
                    >
                      {o.group}
                    </li>,
                  )
                }
                nodes.push(
                  <li key={o.value === '' ? '__empty__' : o.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${
                        selected ? 'bg-slate-100' : ''
                      } ${o.value === '' ? 'text-sm text-slate-600' : ''}`}
                      onClick={() => pick(o.value)}
                    >
                      {o.subLabel ? (
                        <span className="block min-w-0">
                          <span
                            className={`block truncate text-sm ${
                              selected ? 'font-medium text-slate-900' : 'text-slate-900'
                            }`}
                          >
                            {o.label}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {o.subLabel}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={`block truncate text-sm ${
                            selected ? 'font-medium' : ''
                          }`}
                        >
                          {o.label}
                        </span>
                      )}
                    </button>
                  </li>,
                )
                return nodes
              })
            })()
          )}
        </ul>
      </div>
    ) : null

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`${className} flex items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        onClick={() => {
          if (open) close()
          else openList()
        }}
      >
        {selectedOption ? (
          selectedOption.subLabel ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">
                {selectedOption.label}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {selectedOption.subLabel}
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm">{selectedOption.label}</span>
          )
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-slate-500">{emptyLabel}</span>
        )}
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
