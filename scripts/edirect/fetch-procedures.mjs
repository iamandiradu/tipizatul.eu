#!/usr/bin/env node
/**
 * Fetches procedure detail pages from eDirect (edirect.e-guvernare.ro)
 * and writes a normalised JSON keyed by procedureId to
 * scripts/edirect/procedures.json.
 *
 * Source: each entry in index.json carries a `procedureId`; the same value is
 * used as `IdInregistrare` on
 * https://edirect.e-guvernare.ro/Admin/Proceduri/ProceduraVizualizare.aspx
 *
 * For each unique procedureId we parse:
 *   - title (h1.page-title)
 *   - structured label/value pairs (div.csslabelsmall / div.csslabellarge)
 *       Descriere procedura, Cai de atac, Date de contact,
 *       Institutia responsabila, Modalitate prestare, Timp de solutionare,
 *       Termen de arhivare, Termen de completare dosar, Taxe, ...
 *   - "informational only" flag (procedura-informationala-notificare panel)
 *   - input documents table (proc-viz-documenteintrare)
 *   - output documents table (proc-viz-documenteiesire)
 *   - legal acts table (proc-viz-legi)
 *
 * Unknown labels are preserved in `rawFields[]` so the schema can grow without
 * silently dropping data.
 *
 * Usage
 *   node scripts/edirect/fetch-procedures.mjs                  # all unique ids
 *   node scripts/edirect/fetch-procedures.mjs --dry-run        # parse, no write
 *   node scripts/edirect/fetch-procedures.mjs --limit 20
 *   node scripts/edirect/fetch-procedures.mjs --concurrency 5
 *   node scripts/edirect/fetch-procedures.mjs --procedure 405713   # single id
 *   node scripts/edirect/fetch-procedures.mjs --force          # ignore progress
 *
 * Resume: progress is persisted to fetch-procedures-progress.json. Re-runs
 * skip already-fetched ids unless --force is given.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_PATH = resolve(__dirname, 'index.json')
const OUT_PATH = resolve(__dirname, 'procedures.json')
const PROGRESS_PATH = resolve(__dirname, 'fetch-procedures-progress.json')

const BASE = 'https://edirect.e-guvernare.ro'
const PAGE_URL = (id) =>
  `${BASE}/Admin/Proceduri/ProceduraVizualizare.aspx?IdInregistrare=${encodeURIComponent(id)}&IdOperatiune=4`

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const limit = parseInt(getArg('limit') ?? '0', 10) || Infinity
const concurrency = Math.max(1, parseInt(getArg('concurrency') ?? '3', 10))
const onlyId = getArg('procedure')

// ── Pretty logging ──────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')
const logErr = (s) => process.stderr.write(s + '\n')

// ── Parsing ──────────────────────────────────────────────────────────────────

const LABEL_KEY_MAP = {
  'descriere procedura': 'descriere',
  'cai de atac': 'caiDeAtac',
  'date de contact': 'dateContact',
  'institutia responsabila': 'institutiaResponsabila',
  'modalitate prestare': 'modalitatePrestare',
  'timp de solutionare': 'timpSolutionare',
  'termen de arhivare': 'termenArhivare',
  'termen de completare dosar': 'termenCompletareDosar',
  'taxe': 'taxe',
}

function diacriticless(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function cleanText(node) {
  if (!node) return ''
  // Replace <br> with newlines so multi-line contact blocks stay readable.
  const clone = node.cloneNode(true)
  for (const br of clone.querySelectorAll('br')) {
    br.replaceWith(clone.ownerDocument.createTextNode('\n'))
  }
  // Block-level breaks between paragraphs.
  for (const p of clone.querySelectorAll('p, div')) {
    p.appendChild(clone.ownerDocument.createTextNode('\n'))
  }
  const text = (clone.textContent || '').replace(/ /g, ' ')
  return text
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n')
}

function absoluteUrl(href) {
  if (!href) return null
  try {
    return new URL(href, BASE).toString()
  } catch {
    return null
  }
}

function parseTable(doc, selector, columns) {
  const table = doc.querySelector(selector)
  if (!table) return []
  const rows = [...table.querySelectorAll('tbody > tr')].filter(
    (r) => !r.classList.contains('tabel-header'),
  )
  return rows.map((row) => {
    const cells = [...row.children]
    const out = {}
    for (const col of columns) {
      const cell = cells[col.idx]
      if (!cell) { out[col.name] = col.kind === 'bool-glyph' ? false : null; continue }
      switch (col.kind) {
        case 'bool-glyph':
          out[col.name] = !!cell.querySelector('.glyphicon-ok')
          break
        case 'href': {
          const a = cell.querySelector('a[href]')
          out[col.name] = a ? absoluteUrl(a.getAttribute('href')) : null
          break
        }
        case 'html':
          out[col.name] = cell.innerHTML.trim()
          break
        default:
          out[col.name] = cleanText(cell)
      }
    }
    return out
  })
}

function parseProcedure(html, procedureId) {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  const title = doc.querySelector('h1.page-title')?.textContent?.trim() || null

  // Some IDs return an error page instead of a procedure (deleted/missing).
  const errorPanel = doc.querySelector('.cssPanelEroare')
  const errorText = cleanText(errorPanel)
  if (!title && errorText) {
    return { procedureId, missing: true, error: errorText, fetchedAt: new Date().toISOString() }
  }

  const labels = [...doc.querySelectorAll('div.csslabelsmall')]
  const values = [...doc.querySelectorAll('div.csslabellarge')]
  const rawFields = []
  const fields = {}
  const pairCount = Math.min(labels.length, values.length)
  for (let i = 0; i < pairCount; i++) {
    const label = labels[i].textContent.trim()
    const valueHtml = values[i].innerHTML.trim()
    const valueText = cleanText(values[i])
    rawFields.push({ label, valueHtml, valueText })
    const key = LABEL_KEY_MAP[diacriticless(label)]
    if (key) fields[key] = valueText
  }

  const informationalNotice = doc.querySelector(
    '.procedura-informationala-notificare span',
  )?.textContent?.trim()
  const informational = !!informationalNotice

  const documents = parseTable(doc, 'table.proc-viz-documenteintrare', [
    { name: 'nr', idx: 0, kind: 'text' },
    { name: 'name', idx: 1, kind: 'text' },
    { name: 'description', idx: 2, kind: 'text' },
    { name: 'required', idx: 3, kind: 'bool-glyph' },
    { name: 'eSignature', idx: 4, kind: 'bool-glyph' },
    { name: 'type', idx: 5, kind: 'text' },
    { name: 'downloadUrl', idx: 6, kind: 'href' },
  ])

  const outputDocuments = parseTable(doc, 'table.proc-viz-documenteiesire', [
    { name: 'nr', idx: 0, kind: 'text' },
    { name: 'name', idx: 1, kind: 'text' },
    { name: 'type', idx: 2, kind: 'text' },
    { name: 'downloadUrl', idx: 3, kind: 'href' },
  ])

  const laws = parseTable(doc, 'table.proc-viz-legi', [
    { name: 'nr', idx: 0, kind: 'text' },
    { name: 'name', idx: 1, kind: 'text' },
    { name: 'downloadUrl', idx: 2, kind: 'href' },
  ])

  return {
    procedureId,
    title,
    informational,
    informationalNotice: informationalNotice || null,
    fields,
    rawFields,
    documents,
    outputDocuments,
    laws,
    fetchedAt: new Date().toISOString(),
  }
}

// ── Networking ───────────────────────────────────────────────────────────────

async function fetchProcedureHtml(id, attempt = 1) {
  const url = PAGE_URL(id)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'tipizatul.eu-scraper/1.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ro,en;q=0.8',
      },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    // Sanity check: under load eDirect occasionally serves a 200 with the chrome
    // but no procedure body. Detect by absence of the preview panel marker and
    // retry — a fresh request usually returns the real content.
    if (!/pnlPrevizualizare/.test(html)) {
      throw new Error('empty body (no pnlPrevizualizare)')
    }
    return html
  } catch (err) {
    // 5 attempts with exponential backoff (1s, 2s, 4s, 8s) — empty-body
    // 200s recover much better with patience than with concurrency.
    if (attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)))
      return fetchProcedureHtml(id, attempt + 1)
    }
    throw err
  }
}

// ── Progress ─────────────────────────────────────────────────────────────────

function loadProgress() {
  if (force || !existsSync(PROGRESS_PATH)) return { fetched: {}, failed: {} }
  return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
}

function saveProgress(p) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf-8')
}

function loadExistingOutput() {
  if (force || !existsSync(OUT_PATH)) return {}
  try {
    const obj = JSON.parse(readFileSync(OUT_PATH, 'utf-8'))
    return obj.procedures || {}
  } catch {
    return {}
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function uniqueProcedureIds() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error(`index.json not found at ${INDEX_PATH} (run fetch-index.mjs first)`)
  }
  const idx = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
  const entries = Array.isArray(idx) ? idx : (idx.entries || [])
  const seen = new Set()
  for (const e of entries) {
    const id = e.procedureId
    if (id && !seen.has(id)) seen.add(String(id))
  }
  return [...seen]
}

async function processQueue(ids, results, progress) {
  let cursor = 0
  let done = 0
  let failed = 0
  const total = ids.length

  async function worker() {
    while (cursor < ids.length) {
      const i = cursor++
      const id = ids[i]
      try {
        const html = await fetchProcedureHtml(id)
        const parsed = parseProcedure(html, id)
        results[id] = parsed
        progress.fetched[id] = parsed.fetchedAt
        delete progress.failed[id]
        done++
        const flag = parsed.missing
          ? `${C.yellow}missing${C.reset}`
          : parsed.informational
            ? `${C.dim}info${C.reset}`
            : `${C.green}ok${C.reset}`
        log(`[${done + failed}/${total}] ${id} ${flag} ${C.dim}${parsed.title?.slice(0, 70) || ''}${C.reset}`)
      } catch (err) {
        failed++
        progress.failed[id] = String(err?.message || err)
        logErr(`[${done + failed}/${total}] ${id} ${C.red}FAIL${C.reset} ${err?.message || err}`)
      }

      if ((done + failed) % 20 === 0 && !dryRun) {
        saveProgress(progress)
        writeOutput(results)
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
  return { done, failed }
}

function writeOutput(results) {
  const manifest = {
    fetchedAt: new Date().toISOString(),
    source: BASE,
    total: Object.keys(results).length,
    procedures: results,
  }
  writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8')
}

async function main() {
  let ids
  if (onlyId) {
    ids = [onlyId]
  } else {
    ids = uniqueProcedureIds()
    log(`${C.dim}unique procedureIds in index.json: ${ids.length}${C.reset}`)
  }

  const progress = loadProgress()
  const results = loadExistingOutput()

  if (!onlyId && !force) {
    const before = ids.length
    ids = ids.filter((id) => !progress.fetched[id])
    const skipped = before - ids.length
    if (skipped) log(`${C.dim}skipping ${skipped} already-fetched (use --force to refetch)${C.reset}`)
  }

  if (ids.length > limit) ids = ids.slice(0, limit)

  log(`Fetching ${ids.length} procedure(s) with concurrency=${concurrency}${dryRun ? ' (dry-run)' : ''}`)

  const stats = await processQueue(ids, results, progress)

  if (!dryRun) {
    saveProgress(progress)
    writeOutput(results)
  }

  log()
  log(`${C.bold}Summary${C.reset}`)
  log(`  done:   ${stats.done}`)
  log(`  failed: ${stats.failed}`)
  log(`  total stored: ${Object.keys(results).length}`)
  if (!dryRun) {
    log(`  output: ${OUT_PATH}`)
    log(`  progress: ${PROGRESS_PATH}`)
  }

  if (onlyId && results[onlyId]) {
    log()
    log(`${C.cyan}── Parsed procedure ${onlyId} ──${C.reset}`)
    log(JSON.stringify(results[onlyId], null, 2))
  }
}

main().catch((err) => { logErr(`${C.red}${err?.stack || err}${C.reset}`); process.exit(1) })
