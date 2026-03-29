import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, LogOut, PlusCircle, Save, Loader2, Pencil, X, ArchiveX, ArchiveRestore, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { signOut } from '@/lib/auth'
import { uploadPdfToDrive, replacePdfOnDrive, deletePdfFromDrive, archivePdfOnDrive, restorePdfOnDrive } from '@/lib/drive'
import { fetchAllTemplates, saveTemplate, patchTemplate } from '@/lib/firestore'
import { introspectPdf } from '@/lib/pdf-introspect'
import { useSessionStore } from '@/stores/sessionStore'
import type { Template, TemplateField } from '@/types/template'

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

function NewTemplateWizard({ onSaved, driveAccessToken }: { onSaved: () => void; driveAccessToken: string | null }) {
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
      onSaved()
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

function TemplateRow({ t, onEdit, onArchive }: { t: Template; onEdit: (t: Template) => void; onArchive: (t: Template) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t.category && `${t.category} · `}
          {t.fields.filter((f: TemplateField) => !f.hidden).length} câmpuri vizibile · v{t.version}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(t)} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1" title="Editează">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onArchive(t)} className="text-gray-300 dark:text-gray-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors p-1" title="Arhivează">
          <ArchiveX className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActivePanel = { mode: 'add' } | { mode: 'edit'; template: Template } | null

export default function AdminPage() {
  const [active, setActive] = useState<ActivePanel>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [archivedOpen, setArchivedOpen] = useState(false)
  const { driveAccessToken } = useSessionStore()

  async function reload() {
    const all = await fetchAllTemplates()
    setTemplates(all)
  }

  useEffect(() => { reload() }, [])

  const active_templates = templates.filter((t) => !t.archived)
  const archived_templates = templates.filter((t) => t.archived)

  async function handleArchive(t: Template) {
    await patchTemplate(t.id, { archived: true })
    if (driveAccessToken) {
      await archivePdfOnDrive(driveAccessToken, t.driveFileId).catch(() => {})
    }
    await reload()
  }

  async function handleRestore(t: Template) {
    await patchTemplate(t.id, { archived: false })
    if (driveAccessToken) {
      await restorePdfOnDrive(driveAccessToken, t.driveFileId).catch(() => {})
    }
    await reload()
  }

  async function handleDeletePermanent(t: Template) {
    if (!confirm(`Ștergeți definitiv "${t.name}"? Această acțiune nu poate fi anulată.`)) return
    if (driveAccessToken) {
      await deletePdfFromDrive(driveAccessToken, t.driveFileId).catch(() => {})
    }
    await patchTemplate(t.id, { archived: true })
    // Firestore documents are soft-deleted via archive; hard delete if needed:
    // await deleteTemplate(t.id)
    await reload()
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

      {active?.mode === 'add' && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Formular nou</h2>
          <NewTemplateWizard
            driveAccessToken={driveAccessToken}
            onSaved={async () => { setActive(null); await reload() }}
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
            onSaved={async () => { setActive(null); await reload() }}
            onCancel={() => setActive(null)}
          />
        </div>
      )}

      {active_templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Formulare active
          </h2>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {active_templates.map((t) => (
              <TemplateRow
                key={t.id}
                t={t}
                onEdit={(tmpl) => setActive({ mode: 'edit', template: tmpl })}
                onArchive={handleArchive}
              />
            ))}
          </div>
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
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {archived_templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t.category && `${t.category} · `}v{t.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleRestore(t)} className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors p-1" title="Restaurează">
                      <ArchiveRestore className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeletePermanent(t)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Șterge definitiv">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
