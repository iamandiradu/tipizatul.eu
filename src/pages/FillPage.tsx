import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import { fetchTemplate } from '@/lib/firestore'
import { fetchPdfFromDrive } from '@/lib/drive'
import { fillAndDownload } from '@/lib/pdf-fill'
import { buildZodSchema } from '@/lib/schema-builder'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { useSessionStore } from '@/stores/sessionStore'
import PdfPreview from '@/components/PdfPreview'
import FormField from '@/components/FormField'
import type { Template, FormValues } from '@/types/template'

export default function FillPage() {
  const { id } = useParams<{ id: string }>()
  const [template, setTemplate] = useState<Template | null>(null)
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { formDraft, setFormDraft } = useSessionStore()

  // Restore saved defaults from session if user navigated back to this template
  const savedValues = formDraft !== null && formDraft.templateId === id ? formDraft.values : undefined

  useEffect(() => {
    if (!id) return
    fetchTemplate(id)
      .then(async (tmpl) => {
        if (!tmpl || tmpl.archived) {
          setNotFound(true)
          return
        }
        setTemplate(tmpl)
        try {
          const bytes = await fetchPdfFromDrive(tmpl.driveFileId)
          setPdfBytes(bytes)
        } catch (err) {
          setLoadError(err instanceof Error ? err.message : 'Nu s-a putut încărca PDF-ul.')
        }
      })
      .catch(() => setNotFound(true))
  }, [id])

  // SEO metadata for this form. Falls back to a generic title while loading
  // so search engines that respect <title> changes still index something.
  const seoTitle = template
    ? `${template.name}${template.organization ? ' — ' + template.organization : ''}`
    : 'Formular tipizat'
  const seoDescription = template
    ? `Completați online formularul „${template.name}"${template.organization ? ` emis de ${template.organization}` : ''}${template.county ? ` (${template.county})` : ''}. Descărcați PDF-ul gata de imprimat sau de transmis prin canalele oficiale.`
    : 'Completați online un formular tipizat emis de o instituție publică din România.'
  useDocumentMeta({
    title: seoTitle,
    description: seoDescription,
    canonical: id ? `https://tipizatul.eu/fill/${id}` : undefined,
    noindex: notFound || !template,
  })

  // JSON-LD structured data so search engines treat each form as a real
  // government document, not a generic SPA URL. Mounted only when the
  // template loads; cleaned up on unmount or template change.
  useEffect(() => {
    if (!template) return
    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'DigitalDocument',
      name: template.name,
      description: seoDescription,
      inLanguage: 'ro',
      isAccessibleForFree: true,
      fileFormat: 'application/pdf',
      url: `https://tipizatul.eu/fill/${template.id}`,
    }
    if (template.organization) {
      ld.publisher = { '@type': 'GovernmentOrganization', name: template.organization }
    }
    if (template.county) {
      ld.spatialCoverage = { '@type': 'AdministrativeArea', name: template.county }
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(ld)
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [template, seoDescription])

  const zodSchema = template ? buildZodSchema(template) : null

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
    defaultValues: savedValues as FormValues | undefined,
  })

  // Persist form values to session store as the user types
  useEffect(() => {
    if (!id || !template) return
    const subscription = watch((values) => {
      setFormDraft({ templateId: id, values: values as FormValues })
    })
    return () => subscription.unsubscribe()
  }, [id, template, watch, setFormDraft])

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Formularul nu a fost găsit.</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm mt-2 block">
          ← Înapoi la catalog
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400 font-medium mb-1">Nu s-a putut încărca formularul.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 font-mono">{loadError}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la catalog
        </Link>
      </div>
    )
  }

  if (!template || !pdfBytes) {
    return <div className="text-center py-16 text-gray-400">Se încarcă...</div>
  }

  const visibleFields = template.fields
    .filter((f) => !f.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const groups = visibleFields.reduce<Record<string, typeof visibleFields>>((acc, f) => {
    const g = f.group || 'General'
    if (!acc[g]) acc[g] = []
    acc[g].push(f)
    return acc
  }, {})

  async function onSubmit(values: FormValues) {
    if (!template || !pdfBytes) return
    setExporting(true)
    setExportError(null)
    try {
      await fillAndDownload(template, pdfBytes, values)
      // Clear draft after a successful download
      setFormDraft(null)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Eroare la generarea PDF-ului.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{template.name}</h1>
        {template.category && (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {template.category}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {Object.entries(groups).map(([groupName, fields]) => (
          <section key={groupName} className="mb-6">
            {Object.keys(groups).length > 1 && (
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100 dark:border-gray-800">
                {groupName}
              </h2>
            )}
            <div className="space-y-4">
              {fields.map((f) => (
                <FormField
                  key={f.pdfFieldName}
                  field={f}
                  register={register as Parameters<typeof FormField>[0]['register']}
                  errors={errors as Parameters<typeof FormField>[0]['errors']}
                />
              ))}
            </div>
          </section>
        ))}

        {exportError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{exportError}</p>
        )}

        <button
          type="submit"
          disabled={exporting}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? 'Se generează...' : 'Descarcă PDF completat'}
        </button>
      </form>

      <div className="mt-10 hidden md:block">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Formular original (necompletat)</p>
        <PdfPreview pdfBytes={pdfBytes} />
      </div>
    </div>
  )
}
