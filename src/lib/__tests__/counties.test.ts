import { describe, it, expect } from 'vitest'
import { canonicalizeCounty } from '../counties'
import { templateCounty, NO_COUNTY } from '../template-grouping'

describe('canonicalizeCounty', () => {
  it('returns the canonical ASCII name for diacritic input', () => {
    expect(canonicalizeCounty('București')).toBe('Bucuresti')
    expect(canonicalizeCounty('Bistrița-Năsăud')).toBe('Bistrita-Nasaud')
    expect(canonicalizeCounty('Iași')).toBe('Iasi')
  })

  it('matches case-insensitively', () => {
    expect(canonicalizeCounty('CLUJ')).toBe('Cluj')
    expect(canonicalizeCounty('cluj')).toBe('Cluj')
  })

  it('returns the same name when input is already canonical', () => {
    expect(canonicalizeCounty('Cluj')).toBe('Cluj')
  })

  it('returns undefined for unknown counties or empty input', () => {
    expect(canonicalizeCounty('Atlantis')).toBeUndefined()
    expect(canonicalizeCounty('')).toBeUndefined()
    expect(canonicalizeCounty(undefined)).toBeUndefined()
    expect(canonicalizeCounty(null)).toBeUndefined()
  })
})

describe('templateCounty', () => {
  it('canonicalizes diacritic county strings into the same bucket as ASCII', () => {
    const a = { id: '1', name: 'a', county: 'București' }
    const b = { id: '2', name: 'b', county: 'Bucuresti' }
    expect(templateCounty(a)).toBe(templateCounty(b))
    expect(templateCounty(a)).toBe('Bucuresti')
  })

  it('falls back to text-derivation when the county field has extra wording', () => {
    const t = { id: '1', name: 'cerere', county: 'Municipiul București' }
    expect(templateCounty(t)).toBe('Bucuresti')
  })

  it('keeps unknown county strings as-is so they still group with themselves', () => {
    const a = { id: '1', name: 'a', county: 'Atlantis' }
    const b = { id: '2', name: 'b', county: 'Atlantis' }
    expect(templateCounty(a)).toBe('Atlantis')
    expect(templateCounty(a)).toBe(templateCounty(b))
  })

  it('falls back to NO_COUNTY when nothing matches', () => {
    expect(templateCounty({ id: '1', name: 'no hints' })).toBe(NO_COUNTY)
  })
})
