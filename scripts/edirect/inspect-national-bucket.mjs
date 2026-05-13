#!/usr/bin/env node
/**
 * inspect-national-bucket.mjs — list every procedure that lands in the
 * "Național" bucket on /proceduri, grouped by institution. Helps answer
 * "why is this thing in Național?" after data or grouping changes.
 *
 * Reads public/procedures.json directly (no Firestore needed).
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveCountyFromOrg } from './lib/locality-county.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROCEDURES_PATH = resolve(__dirname, '../../public/procedures.json')

const payload = JSON.parse(readFileSync(PROCEDURES_PATH, 'utf-8'))
const procedures = Object.values(payload.procedures)

const NATIONAL = 'Național'

function diacriticless(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Port of src/lib/procedures.ts:procedureCounty + counties.ts helpers, with
// skipNationalPatterns=true (matches /proceduri behavior).
const ROMANIAN_COUNTIES = [
  'Alba','Arad','Arges','Bacau','Bihor','Bistrita-Nasaud','Botosani','Braila','Brasov',
  'Bucuresti','Buzau','Calarasi','Caras-Severin','Cluj','Constanta','Covasna','Dambovita',
  'Dolj','Galati','Giurgiu','Gorj','Harghita','Hunedoara','Ialomita','Iasi','Ilfov',
  'Maramures','Mehedinti','Mures','Neamt','Olt','Prahova','Salaj','Satu Mare','Sibiu',
  'Suceava','Teleorman','Timis','Tulcea','Valcea','Vaslui','Vrancea',
]
const CANON = new Map(ROMANIAN_COUNTIES.map((c) => [diacriticless(c), c]))
const COUNTY_RE = ROMANIAN_COUNTIES.map((c) => ({
  county: c,
  re: new RegExp(`\\b${diacriticless(c).replace(/[-\s]+/g, '[-\\s]+')}\\b`),
}))
function deriveCountyFromText(text) {
  if (!text) return undefined
  const hay = diacriticless(text)
  for (const { county, re } of COUNTY_RE) if (re.test(hay)) return county
  return undefined
}
function canonicalizeCounty(name) {
  if (!name) return undefined
  return CANON.get(diacriticless(name))
}

// Inline `deriveCountyFromOrg` with skipNationalPatterns=true by guarding the
// imported (.mjs) version: if its result happens to be 'Bucuresti' but no
// override / sector / city / locality token justifies it, the only way it
// could have returned that is the national-pattern branch — treat as "no
// match" to mirror the TS option.
const LOCALITY_HINTS_BUCURESTI = (org, city) => {
  const norm = diacriticless(org || '')
  if (/\bbucuresti\b/.test(norm)) return true
  if (city && diacriticless(city) === 'bucuresti') return true
  if (/\bsector(?:ul|ului)?\s*\d\b|\bsector\s+\d\b/i.test(org || '')) return true
  return false
}
function procedureCounty(p) {
  if (p.county) {
    const raw = String(p.county).trim()
    if (diacriticless(raw) === 'national') return NATIONAL
    return canonicalizeCounty(raw) || deriveCountyFromText(raw) || raw
  }
  let fromOrg = deriveCountyFromOrg(p.institution || '', p.city || null)
  if (fromOrg === 'Bucuresti' && !LOCALITY_HINTS_BUCURESTI(p.institution, p.city)) {
    fromOrg = undefined // national-pattern hit; we want it to stay in Național
  }
  if (fromOrg) return fromOrg
  const fromInst = deriveCountyFromText(p.fields?.institutiaResponsabila)
  return fromInst || NATIONAL
}

const nationalCandidates = procedures.filter((p) => procedureCounty(p) === NATIONAL)
console.log(`procedures landing in Național (post-fix): ${nationalCandidates.length} / ${procedures.length}`)

const byInst = new Map()
for (const p of nationalCandidates) {
  const inst = p.institution || '(no institution)'
  if (!byInst.has(inst)) byInst.set(inst, [])
  byInst.get(inst).push(p)
}

const sorted = [...byInst.entries()].sort((a, b) => b[1].length - a[1].length)
console.log(`\ninstitutions among missing-county procedures: ${sorted.length}\n`)
for (const [inst, list] of sorted.slice(0, 30)) {
  const titles = list.slice(0, 3).map((p) => p.title ?? '(no title)')
  const docs = list.reduce((n, p) => n + p.documents.length, 0)
  console.log(`  ${list.length.toString().padStart(4)}  docs=${docs.toString().padStart(4)}  ${inst}`)
  for (const t of titles) console.log(`        - ${t}`)
}

const empty = nationalCandidates.filter((p) => !p.title && p.documents.length === 0)
console.log(`\nprocedures with no title AND no documents: ${empty.length}`)
for (const p of empty.slice(0, 10)) {
  console.log(`  ${p.procedureId}  inst="${p.institution ?? ''}"  fields.institutiaResponsabila="${p.fields?.institutiaResponsabila ?? ''}"`)
}
