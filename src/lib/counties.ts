export const ROMANIAN_COUNTIES = [
  'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud',
  'Botosani', 'Braila', 'Brasov', 'Bucuresti', 'Buzau', 'Calarasi',
  'Caras-Severin', 'Cluj', 'Constanta', 'Covasna', 'Dambovita', 'Dolj',
  'Galati', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomita',
  'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt',
  'Olt', 'Prahova', 'Salaj', 'Satu Mare', 'Sibiu', 'Suceava',
  'Teleorman', 'Timis', 'Tulcea', 'Valcea', 'Vaslui', 'Vrancea',
] as const

export type RomanianCounty = (typeof ROMANIAN_COUNTIES)[number]

function diacriticless(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Lookup table: diacriticless form → canonical name. Lets us match
// "București" → "Bucuresti" without scanning the list each time.
const CANONICAL_BY_DIACRITICLESS: ReadonlyMap<string, RomanianCounty> = new Map(
  ROMANIAN_COUNTIES.map((c) => [diacriticless(c), c]),
)

// Returns the canonical ASCII name when the input matches a known county
// (diacritic-insensitive, case-insensitive). Returns undefined for unknown
// inputs so callers can decide whether to fall back to text-derivation.
export function canonicalizeCounty(name: string | undefined | null): RomanianCounty | undefined {
  if (!name) return undefined
  return CANONICAL_BY_DIACRITICLESS.get(diacriticless(name))
}

// Build word-boundary regexes once. Hyphens and spaces in county names are
// treated interchangeably so "Bistrița-Năsăud" matches "Bistrita Nasaud" too.
const COUNTY_MATCHERS: Array<{ county: RomanianCounty; re: RegExp }> = ROMANIAN_COUNTIES.map((c) => {
  const needle = diacriticless(c).replace(/[-\s]+/g, '[-\\s]+')
  return { county: c, re: new RegExp(`\\b${needle}\\b`) }
})

export function deriveCountyFromText(text: string | undefined | null): RomanianCounty | undefined {
  if (!text) return undefined
  const hay = diacriticless(text)
  for (const { county, re } of COUNTY_MATCHERS) {
    if (re.test(hay)) return county
  }
  return undefined
}
