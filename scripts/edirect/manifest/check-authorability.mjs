#!/usr/bin/env node
/**
 * check-authorability.mjs — can this document actually be authored as a
 * replica, or is its form body a scan?
 *
 * A replica reproduces the source's wording and puts fields where its blanks
 * are. That is only possible if the blanks and their labels exist as TEXT. The
 * ajutor-social form (Legea 416/2001) looked like an ideal target — 34 files,
 * timeless, clean legal text — and two sessions of work would have gone into it
 * before anyone noticed that Cap. 2/3/4, the entire identity and family
 * section, is scanned imagery. Its extract contains 19k characters and not one
 * occurrence of "Numele", "CNP" or "Act de identitate".
 *
 * So: measure before authoring. A document passes when its extract carries
 * enough field-label vocabulary to reconstruct the form, and enough text per
 * page that the body is not mostly pictures.
 *
 * Usage:
 *   node scripts/edirect/manifest/check-authorability.mjs            # top candidates
 *   node scripts/edirect/manifest/check-authorability.mjs --all      # every R3/R4/R5 candidate
 *   node scripts/edirect/manifest/check-authorability.mjs --min-files 20
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANIFEST = resolve(__dirname, 'manifest.json')

const args = process.argv.slice(2)
const getArg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null }
const showAll = args.includes('--all')
const minFiles = parseInt(getArg('min-files') ?? '15', 10)

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m' }
const log = (s = '') => process.stdout.write(s + '\n')

// The vocabulary a Romanian administrative form uses for its own blanks. If a
// 10-page form mentions none of these, its fields are not text.
const FIELD_LABELS = [
  'numele', 'prenumele', 'cod numeric', 'cnp', 'act de identitate', 'seria', 'domiciliat',
  'localitatea', 'strada', 'judet', 'județ', 'telefon', 'semnatura', 'semnătura',
  'subsemnat', 'data nasterii', 'data naşterii', 'starea civila', 'starea civilă',
]

const fold = (s) => s
  .replace(/[şș]/g, 's').replace(/[ţț]/g, 't').replace(/[ăâ]/g, 'a').replace(/î/g, 'i')
  .toLowerCase()

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))

const rows = []
for (const d of manifest.uniqueDocs || []) {
  const c = d.classification || {}
  if (!['R3', 'R4', 'R5'].includes(c.route)) continue
  if (!c.nationalModelCandidate) continue
  const files = (d.copies || []).length
  if (files < minFiles) continue
  if (!d.textExtractPath) continue
  const p = resolve(__dirname, d.textExtractPath)
  if (!existsSync(p)) continue

  const text = readFileSync(p, 'utf-8')
  const folded = fold(text)
  const hits = FIELD_LABELS.filter((l) => folded.includes(fold(l)))
  const pages = d.pageCount || 1
  const charsPerPage = Math.round((d.textLen || text.length) / pages)

  rows.push({
    files,
    pages,
    charsPerPage,
    labelHits: hits.length,
    hits,
    route: c.route,
    name: ((d.copies || [])[0] || '').split('/').pop() || '',
  })
}

// Thresholds are calibrated on two known outcomes: the tichet-social form,
// which authored cleanly, and ajutor-social, which turned out to be scanned.
const MIN_LABELS = 4
const MIN_CHARS_PER_PAGE = 400

// Zero label hits decides on its own, whatever the character count says. That
// is the ajutor-social signature: 1,465 chars/page of instructions and legal
// citation — dense enough to look healthy — wrapped around a form body that is
// pure imagery. Text volume measures the prose; only the label vocabulary
// tells you whether the FIELDS are text.
const verdict = (r) =>
  r.labelHits === 0 ? 'SCAN'
    : r.labelHits >= MIN_LABELS && r.charsPerPage >= MIN_CHARS_PER_PAGE ? 'AUTHORABLE'
      : r.labelHits < MIN_LABELS && r.charsPerPage < MIN_CHARS_PER_PAGE ? 'SCAN'
        : 'PARTIAL'

rows.sort((a, b) => b.files - a.files)
const shown = showAll ? rows : rows.slice(0, 25)

log(`${C.bold}authorability of national-model candidates${C.reset} ${C.dim}(>=${minFiles} files)${C.reset}`)
log(`${C.dim}AUTHORABLE = field labels present and text-dense; SCAN = form body is imagery${C.reset}\n`)
log(`${'files'.padStart(5)} ${'pg'.padStart(3)} ${'ch/pg'.padStart(6)} ${'labels'.padStart(6)}  verdict     document`)
for (const r of shown) {
  const v = verdict(r)
  const colour = v === 'AUTHORABLE' ? C.green : v === 'SCAN' ? C.red : C.yellow
  log(`${String(r.files).padStart(5)} ${String(r.pages).padStart(3)} ${String(r.charsPerPage).padStart(6)} ${String(r.labelHits).padStart(6)}  ${colour}${v.padEnd(10)}${C.reset}  ${r.name.slice(0, 52)}`)
}

const tally = { AUTHORABLE: 0, PARTIAL: 0, SCAN: 0 }
const tallyFiles = { AUTHORABLE: 0, PARTIAL: 0, SCAN: 0 }
for (const r of rows) { const v = verdict(r); tally[v]++; tallyFiles[v] += r.files }
log(`\n${C.bold}across ${rows.length} candidates${C.reset}`)
for (const k of ['AUTHORABLE', 'PARTIAL', 'SCAN']) {
  log(`  ${k.padEnd(11)} ${String(tally[k]).padStart(3)} docs  ${String(tallyFiles[k]).padStart(4)} files`)
}
log(`\n${C.dim}SCAN candidates belong on the OCR-assisted detection route (R6, Phase 4),`)
log(`not on the replica route — there is no wording to replicate.${C.reset}`)

log(`${C.dim}Note: this measures CAPABILITY, not suitability. A methodology or an`)
log(`informational annex can be perfectly text-dense and still not be a form —`)
log(`check what the document is before authoring it.${C.reset}`)
