import { useEffect, useMemo, useState, useRef } from 'react'
import { Upload, Trash2, LogOut, PlusCircle, Save, Loader2, Pencil, X, ArchiveX, ArchiveRestore, ChevronDown, ChevronRight, ChevronUp, AlertTriangle, MapPin, Search, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { signOut } from '@/lib/auth'
import { uploadPdfToDrive, replacePdfOnDrive, deletePdfFromDrive, archivePdfOnDrive, restorePdfOnDrive } from '@/lib/drive'
import { fetchCatalog, fetchTemplate, saveTemplate, patchTemplate } from '@/lib/firestore'
import { fetchMostDownvotedTemplates, fetchVotesForTemplate, type AdminVote } from '@/lib/votes'
import { introspectPdf } from '@/lib/pdf-introspect'
import {
  diacriticless,
  groupByCountyAndOrg,
  presentCounties,
  templateCounty,
} from '@/lib/template-grouping'
import { useSessionStore } from '@/stores/sessionStore'
import type { Template, TemplateField, SlimTemplate } from '@/types/template'

const ALL_COUNTIES = '__all__'

const adminInputClass = 'w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500'

// ─── Drive token guard ────────────────────────────────────────────────────────

function DriveTokenWarning() {
  return (
    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      Sesiunea Drive a expirat. Deconectați-vă și reconectați-vă pentru a putea încărca PDF-uri.
    </div>
  )
}

// ─── Field annotation row ─────────────────────────────────────────────────────

function FieldRow({ field, onChange }: { field: TemplateField; onChange: (updated: TemplateField) => void }) {
  const rowInput = 'w-full text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1 focus:border-blue-400 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500'

  return (
    <tr className={field.hidden ? 'opacity-40' : ''}>
      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono max-w-[160px] truncate" title={field.pdfFieldName}>
        {field.pdfFieldName}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{field.type}</td>
      <td className="px-3 py-2">
        <input type="text" value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} className={rowInput} />
      </td>
      <td className="px-3 py-2">
        <input type="text" value={field.placeholder ?? ''} placeholder="ex: Ion Popescu" onChange={(e) => onChange({ ...field, placeholder: e.target.value })} className={rowInput} />
      </td>
      <td className="px-3 py-2">
        <input type="text" value={field.hint ?? ''} placeholder="text ajutător sub câmp" onChange={(e) => onChange({ ...field, hint: e.target.value })} className={rowInput} />
      </td>
      <td className="px-3 py-2">
        <input type="text" value={field.group ?? ''} placeholder="grup" onChange={(e) => onChange({ ...field, group: e.target.value })} className={rowInput} />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={field.isRequired} onChange={(e) => onChange({ ...field, isRequired: e.target.checked })} className="h-4 w-4" />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={field.hidden ?? false} onChange={(e) => onChange({ ...field, hidden: e.target.checked })} className="h-4 w-4" />
      </td>
    </tr>
  )
}

// ─── Shared annotation form ───────────────────────────────────────────────────

function AnnotateForm({
  name, setName,
  category, setCategory,
  description, setDescription,
  fields, setFields,
  saving,
  onSave,
  onCancel,
  saveLabel = 'Salvează formular',
  pdfSection,
}: {
  name: string; setName: (v: string) => void
  category: string; setCategory: (v: string) => void
  description: string; setDescription: (v: string) => void
  fields: TemplateField[]; setFields: (v: TemplateField[]) => void
  saving: boolean; onSave: () => void; onCancel: () => void
  saveLabel?: string; pdfSection?: React.ReactNode
}) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nume formular <span className="text-red-500">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={adminInputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categorie</label>
          <input type="text" value={category} placeholder="ex: Stare Civilă" onChange={(e) => setCategory(e.target.value)} className={adminInputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descriere</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={adminInputClass} />
        </div>
      </div>

      {pdfSection}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Câmp PDF</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tip</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Etichetă</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Placeholder</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Hint</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Grup</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Obligatoriu</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Ascuns</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {fields.map((f, i) => (
              <FieldRow
                key={f.pdfFieldName}
                field={f}
                onChange={(updated) => setFields(fields.map((x, j) => (j === i ? updated : x)))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Se salvează...' : saveLabel}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          Anulează
        </button>
      </div>
    </div>
  )
}

// ─── New template wizard ──────────────────────────────────────────────────────

function NewTemplateWizard({ onSaved, driveAccessToken }: { onSaved: (saved: Template) => void; driveAccessToken: string | null }) {
  const [step, setStep] = useState<'upload' | 'annotate'>('upload')
  const [fields, setFields] = useState<TemplateField[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const discovered = await introspectPdf(buffer)
      setPdfFile(file)
      setFields(discovered)
      setName(file.name.replace(/\.pdf$/i, ''))
      setStep('annotate')
    } catch (err) {
      alert('Eroare la procesarea PDF-ului: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!pdfFile || !name.trim()) return
    if (!driveAccessToken) {
      alert('Sesiunea Drive a expirat. Deconectați-vă și reconectați-vă.')
      return
    }
    setSaving(true)
    try {
      const driveFileId = await uploadPdfToDrive(driveAccessToken, pdfFile, name.trim())
      const id = uuidv4()
      const template: Template = {
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        version: 1,
        createdAt: new Date().toISOString(),
        fields,
        driveFileId,
        archived: false,
      }
      await saveTemplate(template)
      onSaved(template)
    } catch (err) {
      alert('Eroare la salvare: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  if (step === 'upload') {
    return (
      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-10 text-center">
        <Upload className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Încărcați un PDF editabil (cu câmpuri AcroForm)</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {loading ? 'Se procesează...' : 'Selectați PDF'}
        </button>
      </div>
    )
  }

  return (
    <AnnotateForm
      name={name} setName={setName}
      category={category} setCategory={setCategory}
      description={description} setDescription={setDescription}
      fields={fields} setFields={setFields}
      saving={saving}
      onSave={handleSave}
      onCancel={() => setStep('upload')}
    />
  )
}

// ─── Edit template panel ──────────────────────────────────────────────────────

function EditTemplatePanel({
  template,
  onSaved,
  onCancel,
  driveAccessToken,
}: {
  template: Template
  onSaved: (updated: Template) => void
  onCancel: () => void
  driveAccessToken: string | null
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [category, setCategory] = useState(template.category ?? '')
  const [fields, setFields] = useState<TemplateField[]>(template.fields)
  const [saving, setSaving] = useState(false)
  const [replacingPdf, setReplacingPdf] = useState(false)
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleReplacePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const discovered = await introspectPdf(buffer)
      const merged = discovered.map((newField) => {
        const existing = fields.find((f) => f.pdfFieldName === newField.pdfFieldName)
        if (existing) {
          return { ...newField, label: existing.label, placeholder: existing.placeholder, hint: existing.hint, group: existing.group, order: existing.order }
        }
        return newField
      })
      setNewPdfFile(file)
      setFields(merged)
    } catch (err) {
      alert('Eroare la procesarea PDF-ului: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    if (newPdfFile && !driveAccessToken) {
      alert('Sesiunea Drive a expirat. Deconectați-vă și reconectați-vă.')
      return
    }
    setSaving(true)
    try {
      if (newPdfFile && driveAccessToken) {
        await replacePdfOnDrive(driveAccessToken, template.driveFileId, newPdfFile)
      }
      const updated: Template = {
        ...template,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        version: template.version + 1,
        fields,
      }
      await saveTemplate(updated)
      onSaved(updated)
    } catch (err) {
      alert('Eroare la salvare: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const pdfSection = (
    <div className="mb-6">
      {replacingPdf ? (
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleReplacePdf} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {pdfLoading ? 'Se procesează...' : newPdfFile ? 'PDF înlocuit ✓' : 'Selectați PDF nou'}
          </button>
          <button onClick={() => { setReplacingPdf(false); setNewPdfFile(null); setFields(template.fields) }} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setReplacingPdf(true)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <Upload className="w-3.5 h-3.5" />
          Înlocuiește PDF-ul sursă
        </button>
      )}
    </div>
  )

  return (
    <AnnotateForm
      name={name} setName={setName}
      category={category} setCategory={setCategory}
      description={description} setDescription={setDescription}
      fields={fields} setFields={setFields}
      saving={saving}
      onSave={handleSave}
      onCancel={onCancel}
      saveLabel="Salvează modificările"
      pdfSection={pdfSection}
    />
  )
}

// ─── Template list ────────────────────────────────────────────────────────────

interface RowActions {
  onEdit?: (t: SlimTemplate) => void
  onArchive?: (t: SlimTemplate) => void
  onRestore?: (t: SlimTemplate) => void
  onDelete?: (t: SlimTemplate) => void
}

function TemplateRow({ t, archived, actions }: { t: SlimTemplate; archived: boolean; actions: RowActions }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${archived ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-900'}`}>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${archived ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{t.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t.category && `${t.category} · `}
          {t.visibleFieldCount} câmpuri vizibile · v{t.version}
        </p>
      </div>
      <div className="flex items-center gap-1 ml-3 shrink-0">
        {actions.onEdit && (
          <button onClick={() => actions.onEdit!(t)} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1" title="Editează">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {actions.onArchive && (
          <button onClick={() => actions.onArchive!(t)} className="text-gray-300 dark:text-gray-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-1" title="Arhivează">
            <ArchiveX className="w-4 h-4" />
          </button>
        )}
        {actions.onRestore && (
          <button onClick={() => actions.onRestore!(t)} className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors p-1" title="Restaurează">
            <ArchiveRestore className="w-4 h-4" />
          </button>
        )}
        {actions.onDelete && (
          <button onClick={() => actions.onDelete!(t)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Șterge definitiv">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function OrgGroup({
  organization,
  templates,
  defaultOpen,
  archived,
  actions,
}: {
  organization: string
  templates: SlimTemplate[]
  defaultOpen: boolean
  archived: boolean
  actions: RowActions
}) {
  const [open, setOpen] = useState(defaultOpen)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Chevron className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 text-left truncate">{organization}</h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 shrink-0">{templates.length}</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
          {templates.map((t) => (
            <TemplateRow key={t.id} t={t} archived={archived} actions={actions} />
          ))}
        </div>
      )}
    </div>
  )
}

function CountyGroup({
  county,
  orgs,
  totalTemplates,
  defaultOpen,
  defaultOrgOpen,
  archived,
  actions,
}: {
  county: string
  orgs: Array<[string, SlimTemplate[]]>
  totalTemplates: number
  defaultOpen: boolean
  defaultOrgOpen: boolean
  archived: boolean
  actions: RowActions
}) {
  const [open, setOpen] = useState(defaultOpen)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section className="mb-3 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/40 dark:bg-gray-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Chevron className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-left truncate">{county}</h2>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 shrink-0">
          {orgs.length} {orgs.length === 1 ? 'instituție' : 'instituții'} · {totalTemplates}{' '}
          {totalTemplates === 1 ? 'formular' : 'formulare'}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          {orgs.map(([org, items]) => (
            <OrgGroup
              key={org}
              organization={org}
              templates={items}
              defaultOpen={defaultOrgOpen}
              archived={archived}
              actions={actions}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Reported issues (votes) ─────────────────────────────────────────────────

function VoteRatioBadge({ up, down }: { up: number; down: number }) {
  const total = up + down
  const ratio = total > 0 ? Math.round((up / total) * 100) : 0
  const tone =
    total === 0 ? 'text-gray-400 dark:text-gray-500' :
    ratio >= 75 ? 'text-green-600 dark:text-green-400' :
    ratio >= 40 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
  return <span className={`text-xs font-mono tabular-nums ${tone}`}>{ratio}%</span>
}

function ReportedIssueRow({
  template,
  expanded,
  onToggle,
  onOpenEdit,
}: {
  template: Template
  expanded: boolean
  onToggle: () => void
  onOpenEdit: (t: Template) => void
}) {
  const [comments, setComments] = useState<AdminVote[] | null>(null)
  const [loading, setLoading] = useState(false)
  const up = template.voteCount?.up ?? 0
  const down = template.voteCount?.down ?? 0

  useEffect(() => {
    if (!expanded || comments) return
    setLoading(true)
    fetchVotesForTemplate(template.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [expanded, comments, template.id])

  const downvotedComments = (comments ?? []).filter((c) => c.value === -1 && c.comment)

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Restrânge' : 'Extinde'}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenEdit(template)}
            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate text-left w-full"
          >
            {template.name}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {template.organization || '—'}{template.county ? ` · ${template.county}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 tabular-nums">
            <ThumbsUp className="w-3.5 h-3.5" /> {up}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-400 tabular-nums">
            <ThumbsDown className="w-3.5 h-3.5" /> {down}
          </span>
          <VoteRatioBadge up={up} down={down} />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
          {loading && <p className="text-xs text-gray-400">Se încarcă comentariile...</p>}
          {!loading && comments && downvotedComments.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Niciun comentariu lăsat de votanți.</p>
          )}
          {!loading && downvotedComments.length > 0 && (
            <ul className="space-y-2">
              {downvotedComments.map((c) => (
                <li key={c.deviceId} className="flex items-start gap-2 text-xs">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{c.comment}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {c.updatedAtIso ? new Date(c.updatedAtIso).toLocaleString('ro-RO') : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ReportedIssuesPanel({ onOpenEdit }: { onOpenEdit: (t: Template) => void }) {
  const [items, setItems] = useState<Template[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sort, setSort] = useState<'down' | 'ratio'>('down')

  useEffect(() => {
    fetchMostDownvotedTemplates(50)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Eroare la încărcarea voturilor.'))
  }, [])

  const sorted = useMemo(() => {
    if (!items) return []
    if (sort === 'down') return [...items].sort((a, b) => (b.voteCount?.down ?? 0) - (a.voteCount?.down ?? 0))
    return [...items].sort((a, b) => {
      const ra = ratio(a)
      const rb = ratio(b)
      return ra - rb
    })
  }, [items, sort])

  if (error) return null
  if (items === null) return null
  if (items.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Probleme raportate
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 dark:text-gray-500">Sortează:</span>
          <button
            type="button"
            onClick={() => setSort('down')}
            className={sort === 'down' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
          >
            voturi negative
          </button>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <button
            type="button"
            onClick={() => setSort('ratio')}
            className={sort === 'ratio' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
          >
            cele mai slabe
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((t) => (
          <ReportedIssueRow
            key={t.id}
            template={t}
            expanded={expandedId === t.id}
            onToggle={() => setExpandedId((cur) => (cur === t.id ? null : t.id))}
            onOpenEdit={onOpenEdit}
          />
        ))}
      </div>
    </div>
  )
}

function ratio(t: Template): number {
  const up = t.voteCount?.up ?? 0
  const down = t.voteCount?.down ?? 0
  const total = up + down
  return total > 0 ? up / total : 1
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActivePanel = { mode: 'add' } | { mode: 'edit'; template: Template } | null

function slimify(t: Template): SlimTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    organization: t.organization,
    county: t.county,
    version: t.version,
    visibleFieldCount: t.fields.filter((f) => !f.hidden).length,
    archived: t.archived,
    driveFileId: t.driveFileId,
  }
}

export default function AdminPage() {
  const [active, setActive] = useState<ActivePanel>(null)
  const [templates, setTemplates] = useState<SlimTemplate[]>([])
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState<string>(ALL_COUNTIES)
  const { driveAccessToken } = useSessionStore()

  async function reload() {
    const all = await fetchCatalog()
    setTemplates(all)
  }

  useEffect(() => { reload() }, [])

  const active_templates = useMemo(() => templates.filter((t) => !t.archived), [templates])
  const archived_templates = useMemo(() => templates.filter((t) => t.archived), [templates])

  const counties = useMemo<string[]>(() => presentCounties(active_templates), [active_templates])

  const filteredActive = useMemo<SlimTemplate[]>(() => {
    const needle = diacriticless(search.trim())
    return active_templates.filter((t) => {
      if (county !== ALL_COUNTIES && templateCounty(t) !== county) return false
      if (!needle) return true
      const haystack = diacriticless(
        [t.name, t.organization, t.county, t.description, t.category].filter(Boolean).join(' '),
      )
      return haystack.includes(needle)
    })
  }, [active_templates, search, county])

  const groupedActive = useMemo(() => groupByCountyAndOrg(filteredActive), [filteredActive])
  const groupedArchived = useMemo(() => groupByCountyAndOrg(archived_templates), [archived_templates])

  const isSearching = search.trim().length > 0
  const isFiltering = isSearching || county !== ALL_COUNTIES
  const autoOpenCounty = isFiltering || groupedActive.length <= 8
  const autoOpenOrg = isSearching

  // Mutations write to `templates/<id>` directly. The slim aggregate
  // (`catalog/index`) becomes stale until rebuilt server-side, so we update
  // the in-memory list optimistically rather than re-reading the aggregate.
  async function handleArchive(t: SlimTemplate) {
    await patchTemplate(t.id, { archived: true })
    if (driveAccessToken) {
      await archivePdfOnDrive(driveAccessToken, t.driveFileId).catch(() => {})
    }
    setTemplates((cur) => cur.map((x) => (x.id === t.id ? { ...x, archived: true } : x)))
  }

  async function handleRestore(t: SlimTemplate) {
    await patchTemplate(t.id, { archived: false })
    if (driveAccessToken) {
      await restorePdfOnDrive(driveAccessToken, t.driveFileId).catch(() => {})
    }
    setTemplates((cur) => cur.map((x) => (x.id === t.id ? { ...x, archived: false } : x)))
  }

  async function handleDeletePermanent(t: SlimTemplate) {
    if (!confirm(`Ștergeți definitiv "${t.name}"? Această acțiune nu poate fi anulată.`)) return
    if (driveAccessToken) {
      await deletePdfFromDrive(driveAccessToken, t.driveFileId).catch(() => {})
    }
    await patchTemplate(t.id, { archived: true })
    setTemplates((cur) => cur.filter((x) => x.id !== t.id))
  }

  async function openEdit(slim: SlimTemplate) {
    const full = await fetchTemplate(slim.id)
    if (!full) {
      alert('Nu am putut încărca formularul.')
      return
    }
    setActive({ mode: 'edit', template: full })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestionați formulare</p>
        </div>
        <div className="flex items-center gap-3">
          {!active && (
            <button
              onClick={() => setActive({ mode: 'add' })}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Adaugă formular
            </button>
          )}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <LogOut className="w-4 h-4" />
            Deconectare
          </button>
        </div>
      </div>

      {!driveAccessToken && <DriveTokenWarning />}

      {!active && <ReportedIssuesPanel onOpenEdit={(t) => setActive({ mode: 'edit', template: t })} />}

      {active?.mode === 'add' && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Formular nou</h2>
          <NewTemplateWizard
            driveAccessToken={driveAccessToken}
            onSaved={(saved) => {
              setActive(null)
              setTemplates((cur) => [...cur, slimify(saved)])
            }}
          />
        </div>
      )}

      {active?.mode === 'edit' && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Editare: {active.template.name}
          </h2>
          <EditTemplatePanel
            template={active.template}
            driveAccessToken={driveAccessToken}
            onSaved={(updated) => {
              setActive(null)
              setTemplates((cur) => cur.map((x) => (x.id === updated.id ? slimify(updated) : x)))
            }}
            onCancel={() => setActive(null)}
          />
        </div>
      )}

      {active_templates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Formulare active
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filteredActive.length} / {active_templates.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Căutați după nume, instituție, județ..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:border-blue-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value={ALL_COUNTIES}>Toate județele</option>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {groupedActive.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
              Nicio potrivire pentru căutarea curentă.
            </div>
          ) : (
            groupedActive.map(({ county: c, orgs, total }) => (
              <CountyGroup
                key={c}
                county={c}
                orgs={orgs}
                totalTemplates={total}
                defaultOpen={autoOpenCounty}
                defaultOrgOpen={autoOpenOrg}
                archived={false}
                actions={{
                  onEdit: openEdit,
                  onArchive: handleArchive,
                }}
              />
            ))
          )}
        </div>
      )}

      {archived_templates.length > 0 && (
        <div>
          <button
            onClick={() => setArchivedOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {archivedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Arhivă ({archived_templates.length})
          </button>

          {archivedOpen && (
            groupedArchived.length === 0 ? null : (
              groupedArchived.map(({ county: c, orgs, total }) => (
                <CountyGroup
                  key={c}
                  county={c}
                  orgs={orgs}
                  totalTemplates={total}
                  defaultOpen={false}
                  defaultOrgOpen={false}
                  archived={true}
                  actions={{
                    onRestore: handleRestore,
                    onDelete: handleDeletePermanent,
                  }}
                />
              ))
            )
          )}
        </div>
      )}
    </div>
  )
}
