import type { Procedure } from '@/types/template'
import { canonicalizeCounty, deriveCountyFromText } from '@/lib/counties'

export interface ProceduresPayload {
  builtAt: string
  source: string
  institutions: string[]
  total: number
  procedures: Record<string, Procedure>
}

let cache: Promise<ProceduresPayload> | null = null

export function loadProcedures(): Promise<ProceduresPayload> {
  if (!cache) {
    cache = fetch('/procedures.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ProceduresPayload>
      })
      .catch((err) => {
        cache = null
        throw err
      })
  }
  return cache
}

export async function loadProcedure(id: string): Promise<Procedure | null> {
  const payload = await loadProcedures()
  return payload.procedures[id] ?? null
}

export interface InstitutionGroup {
  institution: string
  procedures: Procedure[]
}

export interface CountyGroup {
  county: string
  institutions: InstitutionGroup[]
  total: number
}

// Procedures whose county is null (typically central agencies that don't tie
// to a specific county) bucket under this label so they remain browseable.
export const NATIONAL_COUNTY = 'Național'

// Normalize raw county strings from index.json (e.g. "BUCURESTI", "Cluj") to
// the canonical RomanianCounty form so casing variations don't fragment the
// tree. Falls back to text-derivation, then the raw value, then "Național".
export function procedureCounty(p: Procedure): string {
  if (p.county) {
    return (
      canonicalizeCounty(p.county) ||
      deriveCountyFromText(p.county) ||
      p.county
    )
  }
  // Some entries miss an index.json join — try to recover from the
  // institutiaResponsabila string (often suffixed with "Județ X").
  const fromInst = deriveCountyFromText(p.fields?.institutiaResponsabila)
  return fromInst || NATIONAL_COUNTY
}

export function groupByCountyAndInstitution(payload: ProceduresPayload): CountyGroup[] {
  // county -> institution -> procedures[]
  const counties = new Map<string, Map<string, Procedure[]>>()
  for (const p of Object.values(payload.procedures)) {
    const county = procedureCounty(p)
    const institution = p.institution ?? 'Necunoscut'
    if (!counties.has(county)) counties.set(county, new Map())
    const insts = counties.get(county)!
    if (!insts.has(institution)) insts.set(institution, [])
    insts.get(institution)!.push(p)
  }

  return [...counties.entries()]
    .map(([county, insts]) => {
      const institutions: InstitutionGroup[] = [...insts.entries()]
        .map(([institution, procedures]) => ({
          institution,
          procedures: procedures.sort((a, b) =>
            (a.title ?? '').localeCompare(b.title ?? '', 'ro'),
          ),
        }))
        .sort((a, b) => a.institution.localeCompare(b.institution, 'ro'))
      const total = institutions.reduce((acc, g) => acc + g.procedures.length, 0)
      return { county, institutions, total }
    })
    .sort((a, b) => {
      // Pin Național to the bottom; otherwise alphabetical.
      if (a.county === NATIONAL_COUNTY) return 1
      if (b.county === NATIONAL_COUNTY) return -1
      return a.county.localeCompare(b.county, 'ro')
    })
}

// Counts only procedures whose primary input forms include a fillable PDF —
// i.e. something the user can actually open and complete via Tipizatul.
export function countFillablePdfs(p: Procedure): number {
  return p.documents.filter((d) => d.downloadUrl && /\.pdf($|\?)/i.test(d.downloadUrl)).length
}
