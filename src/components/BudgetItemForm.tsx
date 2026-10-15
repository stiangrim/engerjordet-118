import { useState } from 'react'
import { parseAmount } from '../lib/money'
import type { BudgetItem } from '../lib/types'
import type { BudgetItemWrite } from '../lib/project'
import { FormActions } from './FormActions'
import { StatusSelect } from './StatusSelect'

type Props = {
  initial?: BudgetItem
  onSave: (values: BudgetItemWrite) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function BudgetItemForm({ initial, onSave, onCancel, onDelete }: Props) {
  const [category, setCategory] = useState(initial?.category ?? '')
  const [post, setPost] = useState(initial?.post ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [materials, setMaterials] = useState(
    initial ? String(initial.budget_materials) : '0',
  )
  const [labor, setLabor] = useState(
    initial ? String(initial.budget_labor) : '0',
  )
  const [total, setTotal] = useState(
    initial ? String(initial.budget_total) : '0',
  )
  const [hours, setHours] = useState(
    initial?.budget_hours != null ? String(initial.budget_hours) : '',
  )
  const [rate, setRate] = useState(
    initial?.hourly_rate != null ? String(initial.hourly_rate) : '450',
  )
  const [status, setStatus] = useState(initial?.status ?? 'Ikke startet')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function syncTotalFromParts() {
    const sum = parseAmount(materials) + parseAmount(labor)
    setTotal(String(sum))
  }

  async function handleSave() {
    if (!category.trim() || !post.trim()) {
      setError('Kategori og post må fylles ut.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSave({
        category: category.trim(),
        post: post.trim(),
        description: description.trim(),
        budget_materials: parseAmount(materials),
        budget_labor: parseAmount(labor),
        budget_total: parseAmount(total),
        budget_hours: hours ? parseAmount(hours) : null,
        hourly_rate: rate ? parseAmount(rate) : null,
        status,
        comment: comment.trim(),
        sort_order: initial?.sort_order ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lagre')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setBusy(true)
    try {
      await onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke slette')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="font-medium">Kategori</span>
          <input
            className="input mt-1"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>
        <label>
          <span className="font-medium">Post</span>
          <input
            className="input mt-1"
            value={post}
            onChange={(e) => setPost(e.target.value)}
          />
        </label>
      </div>
      <label className="block">
        <span className="font-medium">Beskrivelse</span>
        <textarea
          className="input mt-1"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className="font-medium">Materialer (kr)</span>
          <input
            className="input mt-1"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            onBlur={syncTotalFromParts}
          />
        </label>
        <label>
          <span className="font-medium">Arbeid (kr)</span>
          <input
            className="input mt-1"
            value={labor}
            onChange={(e) => setLabor(e.target.value)}
            onBlur={syncTotalFromParts}
          />
        </label>
        <label>
          <span className="font-medium">Sum (kr)</span>
          <input
            className="input mt-1"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </label>
        <label>
          <span className="font-medium">Timer</span>
          <input
            className="input mt-1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </label>
        <label>
          <span className="font-medium">Timesats</span>
          <input
            className="input mt-1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
        <label>
          <span className="font-medium">Status</span>
          <div className="mt-1">
            <StatusSelect value={status} onChange={setStatus} />
          </div>
        </label>
      </div>
      <label className="block">
        <span className="font-medium">Kommentar</span>
        <textarea
          className="input mt-1"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      {error ? <p className="text-red-600">{error}</p> : null}
      <FormActions
        busy={busy}
        onSave={() => void handleSave()}
        onCancel={onCancel}
        onDelete={onDelete ? () => void handleDelete() : undefined}
      />
    </div>
  )
}
