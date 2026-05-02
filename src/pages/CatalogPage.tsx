import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, FileText, MapPin, Search } from 'lucide-react'
import { fetchCatalog } from '@/lib/firestore'
import {
  diacriticless,
  groupByCountyAndOrg,
  presentCounties,
  templateCounty,
} from '@/lib/template-grouping'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import type { SlimTemplate } from '@/types/template'

const ALL_COUNTIES = '__all__'

function TemplateCard({ template }: { template: SlimTemplate }) {
  const fieldCount = template.visibleFieldCount

  return (
    <Link
      to={`/fill/${template.id}`}
      className="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{template.description}</p>
          )}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {template.category && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                {template.category}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">{fieldCount} câmpuri</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function OrganizationSection({
  organization,
  templates,
  defaultOpen,
}: {
  organization: string
  templates: SlimTemplate[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  // Sync with parent's auto-open signal: when search starts/ends, the parent
  // flips defaultOpen and we follow. Manual user toggles within a stable
  // defaultOpen window are preserved (the effect only fires on prop change).
  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Chevron className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 text-left truncate">{organization}</h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 shrink-0">{templates.length}</span>
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function CountySection({
  county,
  orgs,
  totalTemplates,
  defaultOpen,
  defaultOrgOpen,
}: {
  county: string
  orgs: Array<[string, SlimTemplate[]]>
  totalTemplates: number
  defaultOpen: boolean
  defaultOrgOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section className="mb-3 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/40 dark:bg-gray-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
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
        <div id={panelId} className="px-4 pb-4 pt-1 space-y-2">
          {orgs.map(([org, items]) => (
            <OrganizationSection key={org} organization={org} templates={items} defaultOpen={defaultOrgOpen} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function CatalogPage() {
  const [templates, setTemplates] = useState<SlimTemplate[] | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState<string>(ALL_COUNTIES)
  const [introOpen, setIntroOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('tipizatul.intro.expanded') !== 'false'
  })
  const searchId = useId()
  const countyId = useId()
  const introPanelId = useId()

  const toggleIntro = () => {
    setIntroOpen((v) => {
      const next = !v
      try {
        localStorage.setItem('tipizatul.intro.expanded', next ? 'true' : 'false')
      } catch {
        // localStorage may be unavailable; ignore
      }
      return next
    })
  }

  useEffect(() => {
    fetchCatalog()
      .then((all) => setTemplates(all.filter((t) => !t.archived)))
      .catch((err) => {
        console.error('[CatalogPage] Failed to load catalog:', err)
        setTemplates([])
      })
  }, [])

  useDocumentMeta({
    title: 'Tipizatul.eu — Catalog deschis de formulare tipizate românești',
    description:
      'Catalog deschis de formulare tipizate emise de instituții publice din România — primării, ministere, spitale, școli. Completați direct în browser și descărcați PDF-ul.',
    canonical: 'https://tipizatul.eu/',
  })

  const counties = useMemo<string[]>(
    () => (templates ? presentCounties(templates) : []),
    [templates],
  )

  const filtered = useMemo<SlimTemplate[]>(() => {
    if (!templates) return []
    const needle = diacriticless(search.trim())
    return templates.filter((t) => {
      if (county !== ALL_COUNTIES && templateCounty(t) !== county) return false
      if (!needle) return true
      const haystack = diacriticless(
        [t.name, t.organization, t.county, t.description, t.category].filter(Boolean).join(' '),
      )
      return haystack.includes(needle)
    })
  }, [templates, search, county])

  const grouped = useMemo(() => groupByCountyAndOrg(filtered), [filtered])

  const IntroChevron = introOpen ? ChevronDown : ChevronRight
  const intro = (
    <section className="mb-6 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-5">
      <p className="text-sm text-gray-700 dark:text-gray-300 max-w-3xl">
        Un catalog deschis de formulare tipizate emise de instituții publice din România —{' '}
        primării, ministere, spitale, școli, direcții de sănătate, prefecturi, agenții. Toate sunt
        agregate din surse oficiale (eDirect / e-guvernare.ro) și pot fi completate{' '}
        <strong>direct în browser</strong>, fără cont și fără descărcări de software. Tipizatul.eu
        este gratuit și open-source.
      </p>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 max-w-3xl italic">
        * Formularele online se depun la ghișeul 3.
      </p>
      <button
        type="button"
        onClick={toggleIntro}
        aria-expanded={introOpen}
        aria-controls={introPanelId}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
      >
        <IntroChevron className="w-4 h-4" />
        Cum funcționează
      </button>
      {introOpen && (
        <div id={introPanelId}>
          <ol className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Filtrați după județ sau căutați după nume, instituție sau județ.</li>
            <li>Apăsați pe formular pentru a-l completa în browser.</li>
            <li>Descărcați PDF-ul completat și folosiți-l fizic sau electronic.</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500 max-w-3xl">
            Lipsește un formular? Trimiteți o sugestie din butonul{' '}
            <em>„Propune un formular”</em> — vom încerca să-l adăugăm.
          </p>
        </div>
      )}
    </section>
  )

  if (templates === undefined) {
    return (
      <div>
        {intro}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-gray-200 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div>
        {intro}
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Niciun formular disponibil</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Adăugați formulare din secțiunea{' '}
            <Link to="/admin" className="text-blue-600 dark:text-blue-400 hover:underline">
              Admin
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  const isSearching = search.trim().length > 0
  const isFiltering = isSearching || county !== ALL_COUNTIES
  const autoOpenCounty = isFiltering || grouped.length <= 8
  const autoOpenOrg = isSearching

  return (
    <div>
      {intro}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Formulare disponibile</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} / {templates.length}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <label htmlFor={searchId} className="sr-only">
          Caută formulare
        </label>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Căutați după nume, instituție, județ..."
            className="w-full pl-9 pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:border-blue-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        <label htmlFor={countyId} className="sr-only">
          Filtrează după județ
        </label>
        <select
          id={countyId}
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value={ALL_COUNTIES}>Toate județele</option>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>Nicio potrivire pentru căutarea curentă.</p>
        </div>
      ) : (
        grouped.map(({ county: c, orgs, total }) => (
          <CountySection
            key={c}
            county={c}
            orgs={orgs}
            totalTemplates={total}
            defaultOpen={autoOpenCounty}
            defaultOrgOpen={autoOpenOrg}
          />
        ))
      )}
    </div>
  )
}
