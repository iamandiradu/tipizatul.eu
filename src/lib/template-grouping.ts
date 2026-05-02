import { ROMANIAN_COUNTIES, canonicalizeCounty, deriveCountyFromText } from '@/lib/counties'

export const NO_COUNTY = 'Național / Necunoscut'
export const NO_ORG = 'Altele'

// Minimum shape needed to group: an id, a display name, and optional
// county/organization. Both Template and SlimTemplate satisfy this.
export interface GroupableTemplate {
  id: string
  name: string
  county?: string
  organization?: string
}

export function templateCounty(t: GroupableTemplate): string {
  if (t.county) {
    // Normalize "București" / "BUCURESTI" / "Bucuresti" all to the same bucket;
    // fall back to text-derivation when the value has extra wording like
    // "Municipiul București"; finally keep the raw value so unknown counties
    // still group together with themselves.
    return (
      canonicalizeCounty(t.county) ||
      deriveCountyFromText(t.county) ||
      t.county
    )
  }
  return deriveCountyFromText(`${t.organization ?? ''} ${t.name}`) || NO_COUNTY
}

export function diacriticless(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export interface CountyGroup<T extends GroupableTemplate> {
  county: string
  orgs: Array<[string, T[]]>
  total: number
}

export function groupByCountyAndOrg<T extends GroupableTemplate>(
  templates: T[],
): CountyGroup<T>[] {
  const byCounty = new Map<string, Map<string, T[]>>()
  for (const t of templates) {
    const c = templateCounty(t)
    const o = t.organization || NO_ORG
    let orgMap = byCounty.get(c)
    if (!orgMap) {
      orgMap = new Map()
      byCounty.set(c, orgMap)
    }
    const list = orgMap.get(o) ?? []
    list.push(t)
    orgMap.set(o, list)
  }
  const ordered: CountyGroup<T>[] = []
  const keys = [...byCounty.keys()].sort((a, b) => {
    if (a === NO_COUNTY) return 1
    if (b === NO_COUNTY) return -1
    return a.localeCompare(b, 'ro')
  })
  for (const c of keys) {
    const orgMap = byCounty.get(c)!
    const orgs = [...orgMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ro'))
    const total = orgs.reduce((n, [, items]) => n + items.length, 0)
    ordered.push({ county: c, orgs, total })
  }
  return ordered
}

export function presentCounties(templates: GroupableTemplate[]): string[] {
  const present = new Set<string>()
  for (const t of templates) present.add(templateCounty(t))
  const ordered = ROMANIAN_COUNTIES.filter((c) => present.has(c)) as string[]
  if (present.has(NO_COUNTY)) ordered.push(NO_COUNTY)
  return ordered
}
