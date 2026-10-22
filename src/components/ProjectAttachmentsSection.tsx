import { useState } from 'react'
import { useCanWrite } from '../access/AccessContext'
import { CanWrite } from './CanWrite'
import { FormActions } from './FormActions'
import { StoredProjectAttachmentPreview } from './LocalReceiptPreview'
import { ReceiptFilePicker } from './ReceiptFilePicker'
import { SideSheet } from './SideSheet'
import { formatSupabaseError } from '../lib/errors'
import {
  createProjectAttachment,
  deleteProjectAttachment,
  PROJECT_ATTACHMENTS_BUCKET,
  updateProjectAttachment,
  uploadProjectAttachmentFile,
} from '../lib/project'
import { supabase } from '../lib/supabase'
import { clickableCardClass, selectedRowClass } from '../lib/rowStyles'
import type { ProjectAttachment } from '../lib/types'

type SheetState =
  | { mode: 'create' }
  | { mode: 'edit'; attachment: ProjectAttachment }
  | { mode: 'view'; attachment: ProjectAttachment }
  | null

export function ProjectAttachmentsSection({
  projectId,
  attachments,
  onChanged,
}: {
  projectId: string
  attachments: ProjectAttachment[]
  onChanged: () => void
}) {
  const canWrite = useCanWrite()
  const [sheet, setSheet] = useState<SheetState>(null)

  function openAttachment(attachment: ProjectAttachment, viewOnly = false) {
    if (viewOnly || !canWrite) {
      setSheet({ mode: 'view', attachment })
      return
    }
    setSheet({ mode: 'edit', attachment })
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Notater og vedlegg</h2>
        </div>
        <CanWrite>
          <button
            type="button"
            onClick={() => setSheet({ mode: 'create' })}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Nytt notat
          </button>
        </CanWrite>
      </div>

      {attachments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          Ingen notater ennå.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((a) => {
            const selected =
              (sheet?.mode === 'edit' || sheet?.mode === 'view') &&
              sheet.attachment.id === a.id
            return (
              <li key={a.id}>
                <AttachmentCard
                  attachment={a}
                  selected={selected}
                  onOpen={() => openAttachment(a)}
                  onViewFile={() => openAttachment(a, true)}
                />
              </li>
            )
          })}
        </ul>
      )}

      <SideSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={
          sheet?.mode === 'create'
            ? 'Nytt notat'
            : sheet?.mode === 'edit' || sheet?.mode === 'view'
              ? sheet.attachment.title.trim() || 'Uten tittel'
              : ''
        }
        description={
          sheet?.mode === 'create'
            ? 'Overskrift og tekst – vedlegg er valgfritt.'
            : sheet?.mode === 'view' && sheet.attachment.storage_path
              ? 'Forhåndsvisning av vedlegg'
              : undefined
        }
      >
        {sheet?.mode === 'create' ? (
          <AttachmentForm
            projectId={projectId}
            onCancel={() => setSheet(null)}
            onSaved={() => {
              setSheet(null)
              onChanged()
            }}
          />
        ) : null}
        {sheet?.mode === 'edit' ? (
          <AttachmentEditForm
            key={sheet.attachment.id}
            attachment={sheet.attachment}
            onCancel={() => setSheet(null)}
            onSaved={() => {
              setSheet(null)
              onChanged()
            }}
          />
        ) : null}
        {sheet?.mode === 'view' ? (
          <AttachmentViewPanel key={sheet.attachment.id} attachment={sheet.attachment} />
        ) : null}
      </SideSheet>
    </section>
  )
}

function AttachmentCard({
  attachment,
  selected,
  onOpen,
  onViewFile,
}: {
  attachment: ProjectAttachment
  selected: boolean
  onOpen: () => void
  onViewFile: () => void
}) {
  const canWrite = useCanWrite()
  const title = attachment.title.trim() || 'Uten tittel'
  const desc = attachment.description.trim()
  const hasFile = Boolean(attachment.storage_path)
  const openLabel = canWrite ? 'Rediger notat' : 'Vis notat'

  return (
    <article
      tabIndex={0}
      role="button"
      aria-label={openLabel}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm ${clickableCardClass} ${selectedRowClass(selected)}`}
    >
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {desc ? (
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-600">{desc}</p>
      ) : (
        <p className="mt-2 text-slate-400 italic">Ingen beskrivelse</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {hasFile ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewFile()
            }}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 hover:border-slate-400 hover:bg-white"
          >
            Vis vedlegg
          </button>
        ) : (
          <span className="text-xs text-slate-500">Kun tekst</span>
        )}
      </div>
    </article>
  )
}

function AttachmentViewPanel({ attachment }: { attachment: ProjectAttachment }) {
  const desc = attachment.description.trim()

  return (
    <div className="space-y-4">
      {attachment.storage_path ? (
        <StoredProjectAttachmentPreview storagePath={attachment.storage_path} />
      ) : null}
      {desc ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-800">
          {desc}
        </div>
      ) : null}
      {!attachment.storage_path && !desc ? (
        <p className="text-sm text-slate-500">Tomt notat.</p>
      ) : null}
    </div>
  )
}

function AttachmentForm({
  projectId,
  onCancel,
  onSaved,
}: {
  projectId: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim()) {
      setError('Skriv en overskrift.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let storage_path: string | null = null
      if (file) {
        storage_path = await uploadProjectAttachmentFile(projectId, file)
      }
      await createProjectAttachment(projectId, {
        title,
        description,
        storage_path,
      })
      onSaved()
    } catch (e) {
      setError(formatSupabaseError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <label className="block text-sm">
        <span className="font-medium">Overskrift</span>
        <input
          className="input mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="F.eks. Kjøkkendesign IKEA"
          disabled={busy}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Beskrivelse</span>
        <textarea
          className="input mt-1 min-h-[6rem]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notater, mål, lenker du vil huske …"
          disabled={busy}
        />
      </label>
      <ReceiptFilePicker
        purpose="attachment"
        file={file}
        onFileChange={setFile}
        disabled={busy}
      />
      <FormActions busy={busy} onSave={() => void save()} onCancel={onCancel} />
    </div>
  )
}

function AttachmentEditForm({
  attachment,
  onCancel,
  onSaved,
}: {
  attachment: ProjectAttachment
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(attachment.title)
  const [description, setDescription] = useState(attachment.description)
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showExisting =
    attachment.storage_path && !file && !removeFile

  async function save() {
    if (!title.trim()) {
      setError('Skriv en overskrift.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let storage_path: string | null | undefined = undefined
      const oldPath = attachment.storage_path

      if (file) {
        storage_path = await uploadProjectAttachmentFile(attachment.project_id, file)
      } else if (removeFile) {
        storage_path = null
      }

      await updateProjectAttachment(attachment.id, {
        title,
        description,
        ...(storage_path !== undefined ? { storage_path } : {}),
      })

      if (oldPath && (file || removeFile)) {
        await supabase.storage.from(PROJECT_ATTACHMENTS_BUCKET).remove([oldPath])
      }

      onSaved()
    } catch (e) {
      setError(formatSupabaseError(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Slette dette notatet?')) return
    setBusy(true)
    try {
      await deleteProjectAttachment(attachment)
      onSaved()
    } catch (e) {
      setError(formatSupabaseError(e))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {showExisting ? (
        <StoredProjectAttachmentPreview storagePath={attachment.storage_path!} />
      ) : null}
      <label className="block text-sm">
        <span className="font-medium">Overskrift</span>
        <input
          className="input mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Beskrivelse</span>
        <textarea
          className="input mt-1 min-h-[6rem]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />
      </label>
      {showExisting ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setRemoveFile(true)}
          className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
        >
          Fjern vedlegg
        </button>
      ) : null}
      <ReceiptFilePicker
        purpose="attachment"
        file={file}
        onFileChange={(f) => {
          setFile(f)
          if (f) setRemoveFile(false)
        }}
        disabled={busy}
      />
      <FormActions busy={busy} onSave={() => void save()} onCancel={onCancel} />
      <button
        type="button"
        disabled={busy}
        onClick={() => void remove()}
        className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
      >
        Slett notat
      </button>
    </div>
  )
}
