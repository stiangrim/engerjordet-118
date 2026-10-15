export const clickableRowClass =
  'cursor-pointer transition-colors hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-400'

export const clickableCardClass =
  'cursor-pointer transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400'

export function selectedRowClass(selected: boolean): string {
  return selected ? 'bg-slate-100/90 ring-1 ring-inset ring-slate-200' : ''
}
