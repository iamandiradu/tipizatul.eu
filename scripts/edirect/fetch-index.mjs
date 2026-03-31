#!/usr/bin/env node
/**
 * Fetches the full document index from eDirect (edirect.e-guvernare.ro)
 * and writes it to scripts/edirect/index.json.
 *
 * Usage:  node scripts/edirect/fetch-index.mjs
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, 'index.json')

const BASE = 'https://edirect.e-guvernare.ro'
const PAGE_URL = `${BASE}/SitePages/FormulareView.aspx`
const API_URL = `${BASE}/AjaxPCU/GetFormulareView.aspx?lang=ro`
const PAGE_SIZE = 100

// ── Romanian counties list (for matching) ────────────────────────────────────

const JUDETE = [
  'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud',
  'Botosani', 'Braila', 'Brasov', 'Bucuresti', 'Buzau', 'Calarasi',
  'Caras-Severin', 'Caras Severin', 'Cluj', 'Constanta', 'Covasna',
  'Dambovita', 'Dolj', 'Galati', 'Giurgiu', 'Gorj', 'Harghita',
  'Hunedoara', 'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti',
  'Mures', 'Neamt', 'Olt', 'Prahova', 'Salaj', 'Satu Mare', 'Sibiu',
  'Suceava', 'Teleorman', 'Timis', 'Tulcea', 'Valcea', 'Vaslui', 'Vrancea',
]

// Sorted longest-first so "Bistrita-Nasaud" matches before "Bistrita"
const JUDETE_SORTED = [...JUDETE].sort((a, b) => b.length - a.length)

// ── Institution parser ───────────────────────────────────────────────────────

// Patterns: "Primaria Municipiului X", "Primaria Orasului X",
//           "Primaria Comunei X", "Consiliul Judetean X",
//           "Prefectura Judetului X", "Agentia Judeteana ... X"
const CITY_PATTERNS = [
  /^Primaria\s+Municipiului\s+(.+)$/i,
  /^Primaria\s+Orasului\s+(.+)$/i,
  /^Primaria\s+Comunei\s+(.+)$/i,
  /^Primaria\s+Sectorului\s+(\d+)\s+(.+)$/i,
]

const COUNTY_PATTERNS = [
  /^Consiliul\s+Judetean\s+(.+)$/i,
  /^Prefectura\s+Judetului\s+(.+)$/i,
  /^Prefectura\s+Municipiului\s+Bucuresti$/i,
]

function parseInstitution(raw) {
  const name = raw.trim()
  let city = null
  let county = null
  let type = null // 'municipiu' | 'oras' | 'comuna' | 'sector' | 'judet'

  // Check city-level patterns
  for (const pat of CITY_PATTERNS) {
    const m = name.match(pat)
    if (m) {
      if (pat.source.includes('Sectorului')) {
        city = `Sector ${m[1]}`
        county = m[2]
        type = 'sector'
      } else {
        city = m[m.length - 1].replace(/\s*-\s*\w+$/, '').trim() // strip "-Arges" suffix
        type = pat.source.includes('Municipiului') ? 'municipiu'
          : pat.source.includes('Orasului') ? 'oras'
          : 'comuna'
      }
      break
    }
  }

  // Check county-level patterns
  if (!city) {
    for (const pat of COUNTY_PATTERNS) {
      const m = name.match(pat)
      if (m) {
        county = m[1] || 'Bucuresti'
        type = 'judet'
        break
      }
    }
  }

  // Try to extract county from the end of the institution name
  if (!county) {
    for (const j of JUDETE_SORTED) {
      if (name.endsWith(j) || name.endsWith(j.replace(/-/g, ' '))) {
        county = j
        break
      }
    }
  }

  return { institution: name, city, county, type }
}

// ── Fetch logic ──────────────────────────────────────────────────────────────

async function getSessionCookies() {
  const res = await fetch(PAGE_URL)
  return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
}

async function fetchPage(page, cookies) {
  const body = new URLSearchParams({
    current: String(page),
    rowCount: String(PAGE_SIZE),
    'sort[Denumire]': 'asc',
    searchPhrase: '',
    fromProc: 'true',
    id: 'b0df282a-0d67-40e5-8558-c9e93b7befed',
  })

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'Referer': PAGE_URL,
    },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`API returned ${res.status}`)
  return res.json()
}

function buildEntry(row) {
  const cale = (row.Cale || '').trim()
  const ext = cale.includes('.') ? cale.split('.').pop().toLowerCase() : null
  const downloadUrl = cale ? `${BASE}/Uploads/Procedura/${cale}` : null

  const parsed = parseInstitution(row.Institutie || '')

  return {
    id: row.IdDocument,
    institution: parsed.institution,
    city: parsed.city,
    county: parsed.county,
    localityType: parsed.type,
    documentName: (row.Denumire || '').trim().replace(/\s+/g, ' '),
    description: (row.Descriere || '').trim().replace(/\s+/g, ' '),
    procedure: (row.Procedura || '').trim(),
    procedureId: row.IdProcedura,
    fileExtension: ext,
    downloadUrl,
    relativePath: cale,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching session...')
  const cookies = await getSessionCookies()

  // First request to get total
  const first = await fetchPage(1, cookies)
  const total = parseInt(first.total, 10)
  const pages = Math.ceil(total / PAGE_SIZE)
  console.log(`Total documents: ${total} (${pages} pages)`)

  let allRows = first.rows
  for (let p = 2; p <= pages; p++) {
    const data = await fetchPage(p, cookies)
    allRows = allRows.concat(data.rows)
    if (p % 10 === 0 || p === pages) {
      process.stderr.write(`  page ${p}/${pages} (${allRows.length} rows)\n`)
    }
  }

  const entries = allRows.map(buildEntry)

  // Stats
  const exts = {}
  entries.forEach(e => { exts[e.fileExtension || 'unknown'] = (exts[e.fileExtension || 'unknown'] || 0) + 1 })
  console.log('\nBy file type:', exts)
  console.log(`Entries with county: ${entries.filter(e => e.county).length}`)
  console.log(`Entries with city: ${entries.filter(e => e.city).length}`)

  const manifest = {
    fetchedAt: new Date().toISOString(),
    source: PAGE_URL,
    total: entries.length,
    entries,
  }

  writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`\nWrote ${entries.length} entries to ${OUT_PATH}`)
}

main().catch(err => { console.error(err); process.exit(1) })
