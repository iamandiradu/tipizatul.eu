import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  MapPin,
  Search,
} from 'lucide-react'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { useDevMode } from '@/lib/useDevMode'
import {
  countFillablePdfs,
  groupByCountyAndInstitution,
  loadProcedures,
  NATIONAL_COUNTY,
  procedureCounty,
} from '@/lib/procedures'
import type { CountyGroup, InstitutionGroup, ProceduresPayload } from '@/lib/procedures'
import { diacriticless } from '@/lib/template-grouping'
import type { Procedure } from '@/types/template'

const ALL_COUNTIES = '__all__'

function ProcedureRow({ procedure: p }: { procedure: Procedure }) {
  const fillable = countFillablePdfs(p)
  return (
    <li>
      <Link
        to={`/procedura/${p.procedureId}`}
        className="group flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
      >
        <FileText className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            {p.title ?? '(fără titlu)'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{p.documents.length} documente</span>
            {fillable > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                · {fillable} PDF completabil{fillable === 1 ? '' : 'e'}
              </span>
            )}
            {p.informational && (
              <span className="text-amber-700 dark:text-amber-400">· doar informativă</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </Link>
    </li>
  )
}

function InstitutionSection({
  institution,
  procedures,
  defaultOpen,
}: {
  institution: string
  procedures: Procedure[]
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
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
        className="w-full flex items-start justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
      >
        <div className="flex items-start gap-2 min-w-0">
          <Chevron className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <Building2 className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 text-left break-words">
            {institution}
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 mt-0.5 shrink-0">
          {procedures.length}
        </span>
      </button>
      {open && (
        <ul id={panelId} className="px-3 pb-3 pt-1 space-y-2">
          {procedures.map((p) => (
            <ProcedureRow key={p.procedureId} procedure={p} />
          ))}
        </ul>
      )}
    </div>
  )
}

function CountySection({
  county,
  institutions,
  total,
  defaultOpen,
  defaultInstOpen,
}: {
  county: string
  institutions: InstitutionGroup[]
  total: number
  defaultOpen: boolean
  defaultInstOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])
  const isNational = county === NATIONAL_COUNTY
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section className="mb-3 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/40 dark:bg-gray-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-start justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
      >
        <div className="flex items-start gap-2 min-w-0">
          <Chevron className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <MapPin
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              isNational ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'
            }`}
          />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-left break-words">
            {county}
          </h2>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-3 mt-0.5 shrink-0">
          {institutions.length} {institutions.length === 1 ? 'instituție' : 'instituții'} ·{' '}
          {total} {total === 1 ? 'procedură' : 'proceduri'}
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4 pt-1 space-y-2">
          {institutions.map((g) => (
            <InstitutionSection
              key={g.institution}
              institution={g.institution}
              procedures={g.procedures}
              defaultOpen={defaultInstOpen}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ProceduresIndexPage() {
  useDocumentMeta({
    title: 'Proceduri publice · Tipizatul.eu',
    description:
      'Catalog deschis de proceduri publice românești, grupate pe județ și instituție. Fiecare procedură include descrierea oficială și formularele aferente.',
    canonical: 'https://tipizatul.eu/proceduri',
  })

  const { dev } = useDevMode()
  const [payload, setPayload] = useState<ProceduresPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [county, setCounty] = useState<string>(ALL_COUNTIES)
  const searchId = useId()
  const countyId = useId()

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed === '') {
      setDebouncedSearch('')
      return
    }
    const id = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    let cancelled = false
    loadProcedures()
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Build a haystack per procedure once. Search is diacritic-insensitive and
  // matches across title, institution, county.
  const indexed = useMemo(() => {
    if (!payload) return []
    return Object.values(payload.procedures).map((p) => ({
      procedure: p,
      county: procedureCounty(p),
      haystack: diacriticless(
        [p.title ?? '', p.institution ?? '', procedureCounty(p)].join(' '),
      ),
    }))
  }, [payload])

  const presentCountyList = useMemo(() => {
    const set = new Set<string>()
    for (const e of indexed) set.add(e.county)
    const sorted = [...set].sort((a, b) => {
      if (a === NATIONAL_COUNTY) return 1
      if (b === NATIONAL_COUNTY) return -1
      return a.localeCompare(b, 'ro')
    })
    return sorted
  }, [indexed])

  const filteredProcedures = useMemo<Procedure[]>(() => {
    const needle = diacriticless(debouncedSearch.trim())
    const out: Procedure[] = []
    for (const e of indexed) {
      if (county !== ALL_COUNTIES && e.county !== county) continue
      if (needle && !e.haystack.includes(needle)) continue
      out.push(e.procedure)
    }
    return out
  }, [indexed, debouncedSearch, county])

  const grouped = useMemo<CountyGroup[]>(() => {
    if (!payload) return []
    return groupByCountyAndInstitution({
      ...payload,
      procedures: Object.fromEntries(filteredProcedures.map((p) => [p.procedureId, p])),
    })
  }, [payload, filteredProcedures])

  if (loadError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400 font-medium mb-1">
          Nu s-au putut încărca procedurile.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">{loadError}</p>
      </div>
    )
  }

  if (!payload) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/40 dark:bg-gray-900/40 px-4 py-3 animate-pulse"
          >
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 mt-0.5 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="w-4 h-4 mt-0.5 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const totalProcedures = Object.keys(payload.procedures).length
  const isSearching = debouncedSearch.trim().length > 0
  const isFiltering = isSearching || county !== ALL_COUNTIES
  // Mirror CatalogPage thresholds — broad searches that would mount thousands
  // of rows lock the main thread on a single keystroke.
  const AUTO_OPEN_INST_LIMIT = 200
  const AUTO_OPEN_COUNTY_LIMIT = 1500
  const autoOpenCounty = isFiltering
    ? filteredProcedures.length <= AUTO_OPEN_COUNTY_LIMIT
    : grouped.length <= 8
  const autoOpenInst = isSearching && filteredProcedures.length <= AUTO_OPEN_INST_LIMIT
  const tooManyToAutoExpand =
    isSearching && filteredProcedures.length > AUTO_OPEN_INST_LIMIT

  return (
    <div>
      {dev && (
        <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-mono text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-2 uppercase tracking-wide font-sans font-semibold text-[10px] opacity-80">
            <Code2 className="w-3.5 h-3.5" />
            Dev
          </div>
          <div>
            <span className="opacity-70">builtAt:</span> {payload.builtAt}
            {' · '}
            <span className="opacity-70">total:</span> {totalProcedures}
            {' · '}
            <span className="opacity-70">counties:</span> {presentCountyList.length}
          </div>
          <div className="break-all">
            <span className="opacity-70">source:</span> {payload.source}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Proceduri publice
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredProcedures.length} / {totalProcedures}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <label htmlFor={searchId} className="sr-only">
          Caută proceduri
        </label>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Căutați după titlu, instituție, județ..."
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
          {presentCountyList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {tooManyToAutoExpand && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Prea multe rezultate pentru a deschide automat — rafinează căutarea sau extinde manual județele de mai jos.
        </p>
      )}

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>Nicio potrivire pentru căutarea curentă.</p>
        </div>
      ) : (
        grouped.map((g) => (
          <CountySection
            key={g.county}
            county={g.county}
            institutions={g.institutions}
            total={g.total}
            defaultOpen={autoOpenCounty}
            defaultInstOpen={autoOpenInst}
          />
        ))
      )}
    </div>
  )
}
