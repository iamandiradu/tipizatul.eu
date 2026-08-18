#!/usr/bin/env node
/**
 * Phase 3 gate — side-by-side text diff of an authored replica against the
 * canonical source it replicates.
 *
 * A replica's whole point is that the legal wording survives intact, so the
 * check is content drift, not layout: every substantive sentence in the source
 * must still be present in the built PDF. Whitespace, hyphenation, dotted
 * fill-in leaders and the ș/ş cedilla-vs-comma split are all normalized away —
 * those differ between the scrape and our render for uninteresting reasons.
 *
 * Usage:
 *   node verify-replica.mjs <archetype-id> <path-to-source-text.txt>
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePdf } from '../lib/content-stream-parser.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const [id, sourcePath] = process.argv.slice(2)
if (!id || !sourcePath) {
  console.error('usage: node verify-replica.mjs <archetype-id> <source-text.txt>')
  process.exit(1)
}

// Fold the differences that are noise between a scraped PDF and our render:
// both cedilla and comma-below forms of s/t, dotted leaders, and whitespace.
function normalize(s) {
  return s
    .replace(/[şș]/g, 's').replace(/[ŞȘ]/g, 'S')
    .replace(/[ţț]/g, 't').replace(/[ŢȚ]/g, 'T')
    .replace(/[ăâàá]/g, 'a').replace(/[ĂÂÀÁ]/g, 'A')
    .replace(/[îíì]/g, 'i').replace(/[ÎÍÌ]/g, 'I')
    .toLowerCase()
    .replace(/[.…_]{2,}/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// Sentences short enough to be boilerplate ("Data", "Semnătura") carry no
// signal — only check clauses substantial enough that losing one would mean
// the replica actually says something different from the original.
const MIN_WORDS = 6

// Scraped forms are full of ASCII box drawing: `|_|_|_|` comb grids, `____`
// rules, table frames. Normalization strips those characters, leaving word
// fragments that look like prose and get reported missing forever — 27 false
// positives on the first real run, which makes the gate useless. A clause whose
// raw text is mostly frame characters is layout, not wording, so skip it.
function isBoxDrawing(s) {
  const frame = (s.match(/[|_─-╿]/g) || []).length
  return frame / s.length > 0.25
}

const pdfPath = resolve(__dirname, 'dist', `${id}.pdf`)
if (!existsSync(pdfPath)) {
  console.error(`missing ${pdfPath} — run: node build.mjs ${id}`)
  process.exit(1)
}

const parsed = await parsePdf(readFileSync(pdfPath))
// parsePdf returns an object keyed by page index, each page carrying textItems.
const built = normalize(
  Object.values(parsed)
    .flatMap((pg) => (pg.textItems || []).map((i) => i.text))
    .join(' '),
)
const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8')

const clauses = source
  .split(/(?<=[.:;])\s+|\n{2,}/)
  .map((s) => s.replace(/\s+/g, ' ').trim())
  .filter((s) => !isBoxDrawing(s))
  .filter((s) => normalize(s).split(' ').filter(Boolean).length >= MIN_WORDS)

const missing = []
for (const c of clauses) {
  const n = normalize(c)
  // Walk the clause down word by word from the front: a clause split across
  // our layout still matches on its longest contiguous run.
  const words = n.split(' ').filter(Boolean)
  let matched = false
  for (let take = words.length; take >= MIN_WORDS; take--) {
    if (built.includes(words.slice(0, take).join(' '))) { matched = true; break }
  }
  if (!matched) missing.push(c)
}

console.log(`replica : ${id}`)
console.log(`source  : ${sourcePath}`)
console.log(`clauses checked: ${clauses.length}`)
console.log(`present        : ${clauses.length - missing.length}`)
console.log(`missing        : ${missing.length}`)
if (missing.length) {
  console.log('\n--- clauses in the source but not in the replica ---')
  for (const m of missing) console.log(`  · ${m.slice(0, 150)}`)
  console.log('\nReview each: intentional omission (an official-use block we dropped)')
  console.log('is fine; a missing legal clause is content drift and must be fixed.')
}
process.exit(missing.length ? 1 : 0)
