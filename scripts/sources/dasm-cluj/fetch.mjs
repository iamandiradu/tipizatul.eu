#!/usr/bin/env node
/**
 * fetch.mjs — scrape https://dasmclujnapoca.ro/formulare/ into the same
 * Procedure/Document shape the eDirect pipeline produces.
 *
 * Why this lives outside scripts/edirect/: DASM Cluj-Napoca does not publish
 * on eDirect. Its forms page is the only public listing, so it is scraped
 * directly and merged into public/procedures.json by
 * scripts/edirect/build-procedures.mjs alongside the eDirect bundle.
 *
 * ── Page structure ──────────────────────────────────────────────────────────
 * The page is a WPBakery table: `h2` names a service, an optional `h3` names a
 * sub-group inside it, and each `.table-row` carries one document — its label
 * in `.table-row-text`, its URL in a trailing `.link-block` (as *text*, not an
 * anchor, which is why a plain link scrape finds almost nothing here).
 *
 * Mapping:
 *   h3 present  → one procedure per h3   (alocație de stat, stimulent inserție…)
 *   h3 absent   → one procedure per h2   (rows sitting directly under it)
 *
 * ── Identifiers ─────────────────────────────────────────────────────────────
 * `procedureId` is `dasm-cj-<slug>` and each document id is
 * `dasm-cj-<sha1(url)[0..7]>` — namespaced so they can never collide with a
 * numeric eDirect id, and derived from the URL so a re-scrape of a reordered
 * page keeps the ids (and therefore the template joins) stable.
 *
 * Usage
 *   node scripts/sources/dasm-cluj/fetch.mjs
 *   node scripts/sources/dasm-cluj/fetch.mjs --dry-run
 *   node scripts/sources/dasm-cluj/fetch.mjs --html path/to/saved.html
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, 'procedures.json')

const BASE = 'https://dasmclujnapoca.ro'
const PAGE_URL = `${BASE}/formulare/`

export const INSTITUTION = 'Direcția de Asistență Socială și Medicală Cluj-Napoca'
export const COUNTY = 'Cluj'
export const CITY = 'Cluj-Napoca'
const CONTACT =
  'Adresa: Cluj-Napoca, str. Venus f.n., jud. Cluj\n' +
  'Telefon: 0264-599316\n' +
  'E-mail: contact@dasmclujnapoca.ro'

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null }
const dryRun = args.includes('--dry-run')
const htmlPath = getArg('html')

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')

// ── Helpers ──────────────────────────────────────────────────────────────────

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

export function slugify(s) {
  return clean(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i').replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// "1. Formulare alocație de stat + Lista actelor necesare (5 doc.)" and
// "Ajutoare de încălzire 2025-2026 (11 doc)" — the numbering and the document
// count are page furniture, not part of the service name.
export function headingTitle(raw) {
  return clean(raw)
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\(\s*\d+\s*doc\.?\s*\)\s*$/i, '')
    .trim()
}

// The slug is a public URL (/procedura/:id), so it takes the service slug plus
// enough of the sub-group to stay unique, rather than the full sentence-long
// heading. Collisions are resolved by the caller with a numeric suffix.
export function procedureIdFor(service, sub) {
  const head = slugify(service).split('-').slice(0, 5).join('-')
  const tail = sub ? slugify(sub).split('-').slice(0, 5).join('-') : ''
  return ['dasm-cj', head, tail].filter(Boolean).join('-')
}

export function docIdForUrl(url) {
  return `dasm-cj-${createHash('sha1').update(url).digest('hex').slice(0, 8)}`
}

/**
 * The URL text in a `.link-block` is whatever the editor pasted: sometimes a
 * bare path, sometimes an absolute URL, and in two places a leftover shortcode
 * tail (`… .pdf” title=”…”]`). Cut at the first curly quote or bracket, then
 * resolve against the site root.
 */
export function normalizeDocUrl(raw) {
  if (!raw) return null
  let s = clean(raw)
    .replace(/[“”″"']/g, '"')
    .split(/["\]]/)[0]
    .trim()
  if (!s) return null
  if (s.startsWith('//')) s = `https:${s}`
  else if (s.startsWith('/')) s = `${BASE}${s}`
  if (!/^https?:\/\//i.test(s)) return null
  try {
    return new URL(s).href
  } catch {
    return null
  }
}

const EXT_RE = /\.([a-z0-9]{2,5})(?:$|[?#])/i
export function extOf(url) {
  const m = EXT_RE.exec(new URL(url).pathname)
  return m ? m[1].toLowerCase() : ''
}

// A row is a form the citizen fills in, or background reading. The label is a
// reliable signal here: DASM prefixes every fillable document with
// Cerere/Formular/Declarație/Adeverință and every explainer with
// Informații/Acte necesare/Listă/Criterii/…
const INFORMATIVE_RE =
  /^(informa[țt]ii|informatii|acte necesare|lista|list[ăa]|criterii|tipuri de|plafoane|obliga[țt]ii|comunicat|venituri excluse|opis|hcl|instruirea|program|acord[aă]rii)/i
const FORM_RE = /^(cerere|formular|declara[țt]ie|adeverin[țt][ăa]|anexa|fi[șs][ăa]|bilet|foaie|cv|model|adres[ăa]|opis|contract)/i

export function documentType(label) {
  if (INFORMATIVE_RE.test(label) && !/^cerere|^formular/i.test(label)) return 'Document informativ'
  if (FORM_RE.test(label)) return 'Formular tipizat'
  return 'Document'
}

// ── Parse ────────────────────────────────────────────────────────────────────

/**
 * Walks the article in document order, keeping the current h2/h3 as the
 * "bucket" each subsequent `.table-row` falls into. Order matters more than
 * nesting here: WPBakery wraps every row in its own six-deep column stack, so
 * there is no DOM containment between a heading and the rows it introduces.
 */
export function parsePage(html) {
  const dom = new JSDOM(html)
  const doc = dom.window.document
  const article = doc.querySelector('main article') ?? doc.querySelector('main') ?? doc.body

  const groups = []
  let h2 = null
  let group = null

  const startGroup = (title, service, sub = null) => {
    group = { title, service, sub, documents: [] }
    groups.push(group)
    return group
  }

  const nodes = article.querySelectorAll('h2, h3, .table-row')
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'h2') {
      h2 = headingTitle(el.textContent)
      group = null
      continue
    }
    if (tag === 'h3') {
      const sub = headingTitle(el.textContent)
      startGroup(
        h2 && !sub.toLowerCase().startsWith(h2.toLowerCase()) ? `${h2} — ${sub}` : sub,
        h2 ?? sub,
        sub,
      )
      continue
    }

    const label = clean(el.querySelector('.table-row-text')?.textContent)
    if (!label) continue
    const linkBlock = el.querySelector('.link-block')
    // An anchor wins when the editor made one (a few rows link to another
    // page rather than to an upload); otherwise the URL is the block's text.
    const href = linkBlock?.querySelector('a[href]')?.getAttribute('href')
    const url = normalizeDocUrl(href || linkBlock?.textContent)
    if (!url) {
      log(`${C.yellow}skip${C.reset} ${label} ${C.dim}(no resolvable URL)${C.reset}`)
      continue
    }
    if (!group) {
      startGroup(h2 ?? 'Formulare', h2 ?? 'Formulare')
    }
    group.documents.push({ label, url })
  }

  return groups.filter((g) => g.documents.length > 0)
}

// ── Shape ────────────────────────────────────────────────────────────────────

// Procedure-shaped, matching src/types/template.ts so build-procedures.mjs can
// merge these straight into public/procedures.json.
export function toProcedures(groups, fetchedAt) {
  const out = {}
  const seenIds = new Set()
  for (const g of groups) {
    const base = procedureIdFor(g.service, g.sub)
    let procedureId = base
    let n = 2
    while (seenIds.has(procedureId)) procedureId = `${base}-${n++}`
    seenIds.add(procedureId)

    const documents = g.documents.map((d, i) => ({
      nr: String(i + 1),
      name: d.label,
      description: '',
      // The page states no per-document obligation, and inventing one would
      // put a false "Obligatoriu" badge on the card. Left false throughout.
      required: false,
      eSignature: false,
      type: documentType(d.label),
      downloadUrl: d.url,
      eDirectDocId: docIdForUrl(d.url),
      sourceExt: extOf(d.url),
    }))

    out[procedureId] = {
      procedureId,
      title: g.title,
      institution: INSTITUTION,
      county: COUNTY,
      city: CITY,
      source: 'dasm-cluj-napoca',
      sourceUrl: PAGE_URL,
      informational: false,
      informationalNotice: null,
      fields: {
        institutiaResponsabila: `${INSTITUTION}, Județ ${COUNTY}`,
        dateContact: CONTACT,
        modalitatePrestare: 'Local',
      },
      documents,
      outputDocuments: [],
      laws: [],
      fetchedAt,
    }
  }
  return out
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`${C.bold}fetch.mjs${C.reset}${C.dim} — DASM Cluj-Napoca${dryRun ? ' (DRY-RUN)' : ''}${C.reset}`)

  let html
  if (htmlPath) {
    html = readFileSync(resolve(htmlPath), 'utf-8')
    log(`${C.dim}parsing ${htmlPath}${C.reset}`)
  } else {
    const res = await fetch(PAGE_URL, {
      headers: { 'user-agent': 'tipizatul.eu scraper (+https://tipizatul.eu)' },
    })
    if (!res.ok) throw new Error(`GET ${PAGE_URL} → HTTP ${res.status}`)
    html = await res.text()
    log(`${C.dim}fetched ${PAGE_URL} (${(html.length / 1024).toFixed(0)} KB)${C.reset}`)
  }

  const groups = parsePage(html)
  const fetchedAt = new Date().toISOString()
  const procedures = toProcedures(groups, fetchedAt)

  const docs = Object.values(procedures).flatMap((p) => p.documents)
  const unique = new Set(docs.map((d) => d.eDirectDocId))

  log()
  for (const p of Object.values(procedures)) {
    log(`${C.cyan}${p.procedureId.padEnd(46)}${C.reset} ${String(p.documents.length).padStart(2)} doc  ${C.dim}${p.title}${C.reset}`)
  }
  log()
  log(`${Object.keys(procedures).length} procedures · ${docs.length} document rows · ${unique.size} unique files`)

  if (dryRun) {
    log(`${C.dim}dry-run — nothing written${C.reset}`)
    return
  }

  const payload = {
    fetchedAt,
    source: PAGE_URL,
    institution: INSTITUTION,
    county: COUNTY,
    city: CITY,
    total: Object.keys(procedures).length,
    procedures,
  }
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf-8')
  log(`${C.green}wrote${C.reset} ${OUT_PATH}`)
}

// Importable for the tests; only the CLI entry point runs the scrape.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
