import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
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
} from '@/lib/procedures'
import type { CountyGroup, ProceduresPayload } from '@/lib/procedures'
import type { Procedure } from '@/types/template'

export default function ProceduresIndexPage() {
  useDocumentMeta({
    title: 'Proceduri publice · Tipizatul.eu',
    description:
      'Proceduri publice românești grupate pe județ și instituție — fiecare cu documentele și descrierea aferentă.',
  })

  const { dev } = useDevMode()
  const [payload, setPayload] = useState<ProceduresPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    loadProcedures()
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counties = useMemo(
    () => (payload ? groupByCountyAndInstitution(payload) : []),
    [payload],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return counties
    return counties
      .map<CountyGroup>((c) => {
        const institutions = c.institutions
          .map((g) => ({
            ...g,
            procedures: g.procedures.filter(
              (p) =>
                (p.title ?? '').toLowerCase().includes(q) ||
                g.institution.toLowerCase().includes(q) ||
                c.county.toLowerCase().includes(q),
            ),
          }))
          .filter((g) => g.procedures.length > 0)
        const total = institutions.reduce((acc, g) => acc + g.procedures.length, 0)
        return { county: c.county, institutions, total }
      })
      .filter((c) => c.total > 0)
  }, [counties, query])

  const totalShown = filtered.reduce((acc, c) => acc + c.total, 0)
  const institutionCount = useMemo(
    () => counties.reduce((acc, c) => acc + c.institutions.length, 0),
    [counties],
  )

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400 font-medium mb-1">
          Nu s-au putut încărca procedurile.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">{error}</p>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {dev && (
        <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-mono text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-2 uppercase tracking-wide font-sans font-semibold text-[10px] opacity-80">
            <Code2 className="w-3.5 h-3.5" />
            Dev
          </div>
          <div>
            <span className="opacity-70">builtAt:</span> {payload.builtAt}
            {' · '}
            <span className="opacity-70">total:</span> {payload.total}
            {' · '}
            <span className="opacity-70">counties:</span> {counties.length}
            {' · '}
            <span className="opacity-70">institutions:</span> {institutionCount}
          </div>
          <div className="break-all">
            <span className="opacity-70">source:</span> {payload.source}
          </div>
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Proceduri publice
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {counties.length} {counties.length === 1 ? 'județ' : 'județe'}
          {' · '}
          {institutionCount} {institutionCount === 1 ? 'instituție' : 'instituții'}
          {' · '}
          {payload.total} {payload.total === 1 ? 'procedură' : 'proceduri'}
        </p>
      </header>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          type="search"
          placeholder="Caută după județ, instituție sau titlu..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {totalShown} {totalShown === 1 ? 'rezultat' : 'rezultate'}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          Niciun rezultat pentru „{query}".
        </p>
      ) : (
        <div className="space-y-10">
          {filtered.map((c) => (
            <CountySection key={c.county} group={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CountySection({ group }: { group: CountyGroup }) {
  const isNational = group.county === NATIONAL_COUNTY
  return (
    <section>
      <header className="mb-4 flex items-baseline justify-between gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MapPin
            className={`w-5 h-5 shrink-0 ${
              isNational ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'
            }`}
          />
          <span>{group.county}</span>
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {group.institutions.length}{' '}
          {group.institutions.length === 1 ? 'instituție' : 'instituții'}
          {' · '}
          {group.total} {group.total === 1 ? 'procedură' : 'proceduri'}
        </span>
      </header>
      <div className="space-y-6">
        {group.institutions.map((g) => (
          <InstitutionBlock key={g.institution} institution={g.institution} procedures={g.procedures} />
        ))}
      </div>
    </section>
  )
}

function InstitutionBlock({
  institution,
  procedures,
}: {
  institution: string
  procedures: Procedure[]
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="break-words">{institution}</span>
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {procedures.length}{' '}
          {procedures.length === 1 ? 'procedură' : 'proceduri'}
        </span>
      </h3>
      <ul className="space-y-2">
        {procedures.map((p) => (
          <ProcedureRow key={p.procedureId} procedure={p} />
        ))}
      </ul>
    </div>
  )
}

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
                · {fillable} PDF completabil
                {fillable === 1 ? '' : 'e'}
              </span>
            )}
            {p.informational && (
              <span className="text-amber-700 dark:text-amber-400">· informațională</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
      </Link>
    </li>
  )
}
