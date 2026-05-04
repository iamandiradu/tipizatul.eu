import type { Procedure } from '@/types/template'

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
    cache = fetch('/procedures-demo.json')
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

export function groupByInstitution(payload: ProceduresPayload): InstitutionGroup[] {
  const map = new Map<string, Procedure[]>()
  for (const p of Object.values(payload.procedures)) {
    const key = p.institution ?? 'Necunoscut'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return [...map.entries()]
    .map(([institution, procedures]) => ({
      institution,
      procedures: procedures.sort((a, b) =>
        (a.title ?? '').localeCompare(b.title ?? '', 'ro'),
      ),
    }))
    .sort((a, b) => a.institution.localeCompare(b.institution, 'ro'))
}

// Counts only procedures whose primary input forms include a fillable PDF —
// i.e. something the user can actually open and complete via Tipizatul.
export function countFillablePdfs(p: Procedure): number {
  return p.documents.filter((d) => d.downloadUrl && /\.pdf($|\?)/i.test(d.downloadUrl)).length
}
