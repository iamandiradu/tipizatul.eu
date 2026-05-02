import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, FileText, MapPin, Search } from 'lucide-react'
import { fetchCatalog } from '@/lib/firestore'
import {
  diacriticless,
  groupByCountyAndOrg,
  presentCounties,
  templateCounty,
} from '@/lib/template-grouping'
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
        <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

  useEffect(() => {
    fetchCatalog()
      .then((all) => setTemplates(all.filter((t) => !t.archived)))
      .catch((err) => {
        console.error('[CatalogPage] Failed to load catalog:', err)
        setTemplates([])
      })
  }, [])

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

  if (templates === undefined) {
    return <div className="text-center py-16 text-gray-400 dark:text-gray-500">Se încarcă...</div>
  }

  if (templates.length === 0) {
    return (
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
    )
  }

  const isSearching = search.trim().length > 0
  const isFiltering = isSearching || county !== ALL_COUNTIES
  const autoOpenCounty = isFiltering || grouped.length <= 8
  const autoOpenOrg = isSearching

  return (
    <div>
      <section className="mb-6 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-5">
        <p className="text-sm text-gray-700 dark:text-gray-300 max-w-3xl">
          Un catalog deschis de formulare tipizate emise de instituții publice din România.
          Găsiți rapid documentul potrivit, completați-l direct în browser și descărcați PDF-ul
          gata de imprimat sau de trimis prin canalele oficiale.
        </p>
        <ol className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Filtrați după județ sau căutați după nume / instituție.</li>
          <li>Apăsați pe formular pentru a-l completa în browser.</li>
          <li>Descărcați PDF-ul completat și folosiți-l fizic sau electronic.</li>
        </ol>
      </section>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Formulare disponibile</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} / {templates.length}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
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
