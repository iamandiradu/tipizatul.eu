import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Info,
  Mail,
  MapPin,
  Phone,
  Scale,
  ScrollText,
} from 'lucide-react'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

interface ProcDoc {
  nr: string
  name: string
  description?: string
  required: boolean
  eSignature: boolean
  type: string
  downloadUrl: string
}

interface ProcOutputDoc {
  nr: string
  name: string
  type: string
  downloadUrl: string
}

interface ProcLaw {
  nr: string
  name: string
  downloadUrl: string
}

interface ProcedureSample {
  procedureId: string
  title: string
  county: string
  institution: string
  informational: boolean
  informationalNotice: string | null
  fields: {
    descriere?: string
    caiDeAtac?: string
    dateContact?: string
    institutiaResponsabila?: string
    modalitatePrestare?: string
    timpSolutionare?: string
    termenArhivare?: string
    termenCompletareDosar?: string
    taxe?: string
  }
  documents: ProcDoc[]
  outputDocuments: ProcOutputDoc[]
  laws: ProcLaw[]
}

// Sample data: parsed from
// https://edirect.e-guvernare.ro/Admin/Proceduri/ProceduraVizualizare.aspx?IdInregistrare=405713
// Trimmed for readability — full payload lives in the live procedures.json.
const SAMPLE: ProcedureSample = {
  procedureId: '405713',
  title:
    'Recunoaşterea Grupurilor și organizațiilor de producători din sectorul agricol și/sau silvic',
  county: 'Bucuresti',
  institution: 'Ministerul Agriculturii și Dezvoltării Rurale',
  informational: true,
  informationalNotice:
    'Procedura este informațională și nu permite lansarea de solicitări online — depunerea se face fizic la instituție.',
  fields: {
    descriere:
      'Recunoaşterea grupurilor și organizațiilor de producători din sectorul agricol și/sau silvic.\nRegistre publice: https://madr.ro/grupurile-de-producatori-si-organizatiile-recunoscute-in-romania.html',
    caiDeAtac:
      'Sunt prevăzute la art. 17 alin. (1) din Ordinul nr. 358/2016. Litigiile intervenite între beneficiar și autoritatea competentă sunt soluționate conform dispozițiilor de drept comun.',
    dateContact:
      'Adresa: B-dul Carol I, nr. 2-4, sector 3, Bucuresti\nTelefon: 021 307 24 46 / 021 307 24 22\nE-mail: relatii.publice@madr.ro',
    institutiaResponsabila: 'Ministerul Agriculturii și Dezvoltării Rurale, Județ BUCURESTI',
    modalitatePrestare: 'National',
    timpSolutionare: '90 zile calendaristice',
    termenArhivare: '2 ani',
    termenCompletareDosar: '15 zile calendaristice',
  },
  documents: [
    {
      nr: '1',
      name: 'Cererea pentru solicitarea recunoașterii ca grup de producători',
      description:
        'Cererea se depune de societăți comerciale, societăți agricole, asociații, fundații, cooperative agricole și alte forme juridice de asociere, însoțită de actul constitutiv, dovada calității de producător, listele membrilor titulari, copiile contractelor de prestări servicii etc. Anexa nr. 2, Anexa nr. 3 și Anexa nr. 4 la Ordinul 358/2016 sunt incluse.',
      required: true,
      eSignature: false,
      type: 'Formular predefinit',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/I405715__Cerere.docx',
    },
    {
      nr: '2',
      name: 'Cerere de recunoaștere ca organizație de producători',
      description:
        'Pentru una sau mai multe grupe de produse din grupele menționate la art.6, al.2 lit.a și lit.b — Ordin 358/2016. Se depune împreună cu actul constitutiv, dovada calității de producător agricol și documentele Anexei 5.',
      required: true,
      eSignature: false,
      type: 'Formular predefinit',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/I405715__Cerere.docx',
    },
    {
      nr: '3',
      name:
        'Verificarea conformității documentelor pentru eliberarea avizului de recunoaștere',
      description:
        'Structura de specialitate din MADR/DAJ verifică conformitatea documentelor și întocmește procesul verbal de constatare. Anexele nr. 7, 11 și 13 la Ordinul 358/2016 sunt aplicabile.',
      required: true,
      eSignature: false,
      type: 'Formular predefinit',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/I405715__Proces%20verbal%20de%20constatare.docx',
    },
    {
      nr: '4',
      name: 'Eliberarea avizului de recunoaștere',
      description:
        'MADR eliberează avizul de recunoaștere grupurilor și organizațiilor care îndeplinesc criteriile legale.',
      required: true,
      eSignature: false,
      type: 'Formular predefinit',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/I405719__Aviz.docx',
    },
    {
      nr: '5',
      name: 'Înregistrarea în Registrul de evidență',
      description:
        'Înregistrarea grupurilor și organizațiilor de producători recunoscute în registrul de evidență al MADR.',
      required: true,
      eSignature: false,
      type: 'Formular predefinit',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/I405715__Registru%20evidenta.docx',
    },
  ],
  outputDocuments: [
    {
      nr: '1',
      name: 'Proces verbal de conformitate / neconformitate',
      type: 'Document',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/O405719__PV%20constatare%20momentul%20recunoasterii.docx',
    },
    {
      nr: '2',
      name: 'Decizia de respingere a recunoașterii',
      type: 'Document',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/O405719__Decizia%20retragere%20a%20recunoasterii.docx',
    },
    {
      nr: '3',
      name: 'Aviz de recunoaștere a grupurilor și organizațiilor de producători',
      type: 'Document',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/O405719__Aviz.docx',
    },
    {
      nr: '4',
      name: 'Registrul de evidență a grupurilor și organizațiilor de producători',
      type: 'Document',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Procedura/405713/O405719__Registru%20evidenta.docx',
    },
  ],
  laws: [
    {
      nr: '1',
      name: 'LEGE nr. 24 din 4 martie 2016 — aprobarea OG nr. 32/2015',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Legi/15317/Lege%2024%202016.docx',
    },
    {
      nr: '2',
      name:
        'ORDONANȚĂ nr. 37 din 14 iulie 2005 — recunoașterea grupurilor de producători',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Legi/15318/OG%2037%202005.docx',
    },
    {
      nr: '3',
      name: 'NORME METODOLOGICE din 23 martie 2016 de aplicare a OG nr. 37/2005',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Legi/15319/Norme%20met%20OG%2037%202005.docx',
    },
    {
      nr: '4',
      name: 'ORDONANȚĂ nr. 32 din 26 august 2015',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Legi/15320/OG%2032%202015.docx',
    },
    {
      nr: '5',
      name: 'ORDIN nr. 358 din 23 martie 2016',
      downloadUrl:
        'https://edirect.e-guvernare.ro/Uploads/Legi/15321/Ordin%20358%202016.docx',
    },
  ],
}

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

function DocumentCard({ doc }: { doc: ProcDoc }) {
  const [expanded, setExpanded] = useState(false)
  const isFillable = doc.type === 'Formular predefinit'
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
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
              {doc.type}
            </span>
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
          <div className="mt-3 flex flex-wrap gap-2">
            {isFillable ? (
              <Link
                to="/fill/demo"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
              >
                Completează online
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : null}
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
        </div>
      </div>
    </div>
  )
}

function Breadcrumbs({ county, institution }: { county: string; institution: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center flex-wrap gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4"
    >
      <Link to="/formulare" className="hover:text-gray-900 dark:hover:text-gray-100">
        Formulare
      </Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="inline-flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        {county}
      </span>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="inline-flex items-center gap-1">
        <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        {institution}
      </span>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-gray-900 dark:text-gray-100 font-medium">Procedură</span>
    </nav>
  )
}

function ContactBlock({ raw }: { raw: string }) {
  // Cheap parser: pull "Adresa:", "Telefon:", "E-mail:" lines.
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
          <a href={`tel:${telefon.split(/[/,]/)[0].trim().replace(/\s+/g, '')}`} className="hover:underline">
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

export default function ProcedureDemoPage() {
  useDocumentMeta({
    title: `${SAMPLE.title} · Tipizatul.eu (demo)`,
    description: SAMPLE.fields.descriere?.split('\n')[0],
  })

  const p = SAMPLE

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4 inline-flex items-start gap-2 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-sm">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">Demo</strong> — așa va arăta o procedură după importul
          datelor din eDirect. Conținutul e static; rutele <code>/fill/...</code> nu sunt încă
          conectate.
        </span>
      </div>

      <Breadcrumbs county={p.county} institution={p.institution} />

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          {p.title}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {p.fields.institutiaResponsabila}
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
                    <a
                      href={d.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Descarcă ${d.name}`}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </a>
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
                    <a
                      href={law.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{law.name}</span>
                    </a>
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
