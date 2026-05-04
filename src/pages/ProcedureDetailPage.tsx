import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Clock,
  Code2,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Mail,
  MapPin,
  Phone,
  Scale,
  ScrollText,
} from 'lucide-react'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { useDevMode } from '@/lib/useDevMode'
import { loadProcedure } from '@/lib/procedures'
import { fetchCatalog } from '@/lib/firestore'
import type { Procedure, ProcedureDocument, SlimTemplate } from '@/types/template'

const EDIRECT_BASE_URL =
  'https://edirect.e-guvernare.ro/Admin/Proceduri/ProceduraVizualizare.aspx?IdInregistrare='

function MultiLine({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  )
}

function FactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string | undefined
}) {
  if (!value) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  )
}

function DocumentCard({ doc }: { doc: ProcedureDocument }) {
  const [expanded, setExpanded] = useState(false)
  const longDescription = !!doc.description && doc.description.length > 220

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md shrink-0">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              <span className="text-gray-400 dark:text-gray-500 font-normal mr-1.5">
                {doc.nr}.
              </span>
              {doc.name}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {doc.type && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {doc.type}
              </span>
            )}
            {doc.required && (
              <span className="text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                Obligatoriu
              </span>
            )}
            {doc.eSignature && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full">
                <FileSignature className="w-3 h-3" /> Semnătură electronică
              </span>
            )}
          </div>
          {doc.description && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <p className={!expanded && longDescription ? 'line-clamp-3' : ''}>
                <MultiLine text={doc.description} />
              </p>
              {longDescription && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {expanded ? 'Arată mai puțin' : 'Arată mai mult'}
                </button>
              )}
            </div>
          )}
          {doc.downloadUrl && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Descarcă original
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Breadcrumbs({
  county,
  institution,
}: {
  county: string | null | undefined
  institution: string | undefined
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center flex-wrap gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4"
    >
      <Link to="/proceduri" className="hover:text-gray-900 dark:hover:text-gray-100">
        Proceduri
      </Link>
      {county && (
        <>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {county}
          </span>
        </>
      )}
      {institution && (
        <>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {institution}
          </span>
        </>
      )}
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-gray-900 dark:text-gray-100 font-medium">Procedură</span>
    </nav>
  )
}

function ContactBlock({ raw }: { raw: string }) {
  const map = new Map<string, string>()
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^:]+):\s*(.+)$/)
    if (m) map.set(m[1].trim().toLowerCase(), m[2].trim())
  }
  const adresa = map.get('adresa')
  const telefon = map.get('telefon')
  const email = map.get('e-mail') || map.get('email')

  return (
    <div className="space-y-2 text-sm">
      {adresa && (
        <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
          <MapPin className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <span>{adresa}</span>
        </div>
      )}
      {telefon && (
        <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
          <Phone className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <a
            href={`tel:${telefon.split(/[/,]/)[0].trim().replace(/\s+/g, '')}`}
            className="hover:underline"
          >
            {telefon}
          </a>
        </div>
      )}
      {email && (
        <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
          <Mail className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <a href={`mailto:${email}`} className="hover:underline break-all">
            {email}
          </a>
        </div>
      )}
    </div>
  )
}

export default function ProcedureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [p, setP] = useState<Procedure | null>(null)
  const [forms, setForms] = useState<SlimTemplate[]>([])
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { dev } = useDevMode()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setNotFound(false)
    setError(null)
    setP(null)
    setForms([])
    loadProcedure(id)
      .then((proc) => {
        if (cancelled) return
        if (!proc) setNotFound(true)
        else setP(proc)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    // Catalog read is cached + cheap; filtering client-side avoids a Firestore
    // composite index for procedureId queries.
    fetchCatalog()
      .then((catalog) => {
        if (cancelled) return
        setForms(
          catalog
            .filter((t) => t.procedureId === id && !t.archived)
            .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
        )
      })
      .catch(() => {
        // Ignore catalog errors — the procedure detail still renders without
        // the forms section.
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useDocumentMeta({
    title: p
      ? `${p.title ?? 'Procedură'} · Tipizatul.eu`
      : 'Procedură · Tipizatul.eu',
    description: p?.fields.descriere?.split('\n')[0],
  })

  if (notFound) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Procedura nu a fost găsită.</p>
        <Link to="/proceduri" className="text-blue-600 hover:underline text-sm mt-2 block">
          ← Înapoi la proceduri
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400 font-medium mb-1">
          Nu s-a putut încărca procedura.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">{error}</p>
      </div>
    )
  }

  if (!p) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const sourceUrl = `${EDIRECT_BASE_URL}${p.procedureId}`

  return (
    <div className="max-w-5xl mx-auto">
      {dev && (
        <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-mono text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-2 uppercase tracking-wide font-sans font-semibold text-[10px] opacity-80">
            <Code2 className="w-3.5 h-3.5" />
            Dev
          </div>
          <div>
            <span className="opacity-70">procedureId:</span> {p.procedureId}
            {' · '}
            <span className="opacity-70">institution:</span> {p.institution}
            {p.county && (
              <>
                {' · '}
                <span className="opacity-70">county:</span> {p.county}
              </>
            )}
          </div>
          <div className="break-all">
            <span className="opacity-70">eDirect:</span>{' '}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              {sourceUrl}
            </a>
          </div>
          <div>
            <span className="opacity-70">documents:</span> {p.documents.length}
            {' · '}
            <span className="opacity-70">outputDocuments:</span> {p.outputDocuments.length}
            {' · '}
            <span className="opacity-70">laws:</span> {p.laws.length}
            {' · '}
            <span className="opacity-70">linkedTemplates:</span> {forms.length}
          </div>
        </div>
      )}

      <Breadcrumbs county={p.county} institution={p.institution} />

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          {p.title ?? '(fără titlu)'}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {p.fields.institutiaResponsabila || p.institution}
        </p>
        {p.informational && p.informationalNotice && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{p.informationalNotice}</span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <FactCard icon={MapPin} label="Modalitate" value={p.fields.modalitatePrestare} />
        <FactCard icon={Clock} label="Timp soluționare" value={p.fields.timpSolutionare} />
        <FactCard icon={Clock} label="Termen completare" value={p.fields.termenCompletareDosar} />
        <FactCard icon={ScrollText} label="Termen arhivare" value={p.fields.termenArhivare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {p.fields.descriere && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Descriere
              </h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {p.fields.descriere}
              </div>
            </section>
          )}

          {forms.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Formulare disponibile pe Tipizatul
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {forms.length} {forms.length === 1 ? 'formular' : 'formulare'}
                </span>
              </div>
              <ul className="space-y-2">
                {forms.map((f) => (
                  <li key={f.id}>
                    <Link
                      to={`/fill/${f.id}`}
                      className="group flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900/60 rounded-md hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-950 rounded-md shrink-0">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          {f.name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {f.visibleFieldCount}{' '}
                          {f.visibleFieldCount === 1 ? 'câmp' : 'câmpuri'}
                          {' · completează online'}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 mt-1 text-gray-400 dark:text-gray-500 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.documents.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Documente necesare
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {p.documents.length}{' '}
                  {p.documents.length === 1 ? 'document' : 'documente'}
                </span>
              </div>
              <div className="space-y-3">
                {p.documents.map((d) => (
                  <DocumentCard key={d.nr} doc={d} />
                ))}
              </div>
            </section>
          )}

          {p.outputDocuments.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Documente finale (rezultate)
              </h2>
              <ul className="space-y-2">
                {p.outputDocuments.map((d) => (
                  <li
                    key={d.nr}
                    className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md"
                  >
                    <FileText className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="text-gray-400 dark:text-gray-500 mr-1.5">{d.nr}.</span>
                        {d.name}
                      </div>
                    </div>
                    {d.downloadUrl && (
                      <a
                        href={d.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Descarcă ${d.name}`}
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {p.fields.dateContact && (
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Date de contact
              </h3>
              <ContactBlock raw={p.fields.dateContact} />
            </section>
          )}

          {p.fields.taxe && (
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Taxe</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {p.fields.taxe}
              </p>
            </section>
          )}

          {p.fields.caiDeAtac && (
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Căi de atac
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {p.fields.caiDeAtac}
              </p>
            </section>
          )}

          {p.laws.length > 0 && (
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Acte normative
              </h3>
              <ul className="space-y-2">
                {p.laws.map((law) => (
                  <li key={law.nr} className="text-sm">
                    {law.downloadUrl ? (
                      <a
                        href={law.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-start gap-1.5 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{law.name}</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-start gap-1.5 text-gray-700 dark:text-gray-300">
                        <ScrollText className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" />
                        <span>{law.name}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
