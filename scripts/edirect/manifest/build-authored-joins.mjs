#!/usr/bin/env node
/**
 * build-authored-joins.mjs — turn authored-from.json into publishable joins.
 *
 * When a replica is authored FROM an identified corpus document, every copy of
 * that document is served by the replica by construction. There is no
 * similarity threshold to clear and no judgement call to make: the archetype's
 * wording came out of that file. That is stronger evidence than the matcher's
 * 0.87 cosine scores, so these joins are kept in their own file rather than
 * mixed into promoted-joins.json, which is regenerated from scoring and would
 * overwrite them.
 *
 * Usage:
 *   node scripts/edirect/manifest/build-authored-joins.mjs
 *   node scripts/edirect/manifest/build-authored-joins.mjs --check   # verify only
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANIFEST = resolve(__dirname, 'manifest.json')
const SOURCE_MAP = resolve(__dirname, 'authored-from.json')
const OUT = resolve(__dirname, 'authored-joins.json')

const checkOnly = process.argv.includes('--check')
const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m' }
const log = (s = '') => process.stdout.write(s + '\n')

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))
const map = JSON.parse(readFileSync(SOURCE_MAP, 'utf-8'))

const byMd5 = new Map()
for (const d of manifest.uniqueDocs || []) if (d.md5) byMd5.set(d.md5, d)

const archetypes = {}
let totalFiles = 0
let failed = 0

for (const [specId, entry] of Object.entries(map.specs || {})) {
  const doc = byMd5.get(entry.md5)
  if (!doc) {
    log(`${C.red}MISSING${C.reset} ${specId} — md5 ${entry.md5} not in manifest`)
    failed++
    continue
  }
  // The eDirect doc id is the `_<digits>` suffix on each copy's filename.
  const docIds = []
  for (const p of doc.copies || []) {
    const m = /_(\d+)\.[A-Za-z0-9()]+$/.exec(p)
    if (m) docIds.push(m[1])
  }
  const unique = [...new Set(docIds)].sort()
  archetypes[specId] = { md5: entry.md5, document: entry.document, docIds: unique, files: (doc.copies || []).length }
  totalFiles += unique.length
  log(`${C.green}OK${C.reset}      ${specId.padEnd(32)} ${String(unique.length).padStart(3)} docIds  ${String((doc.copies || []).length).padStart(3)} files`)
}

log(`\n${C.bold}${Object.keys(archetypes).length} replicas${C.reset}, ${totalFiles} joined document ids`)
if (failed) log(`${C.red}${failed} unresolved${C.reset}`)

if (!checkOnly) {
  writeFileSync(OUT, JSON.stringify({
    note: 'Joins where the archetype was authored directly from the source document. '
      + 'Certainty, not similarity — see authored-from.json. Regenerate with build-authored-joins.mjs.',
    archetypes,
  }, null, 1), 'utf-8')
  log(`wrote ${OUT}`)
}
process.exit(failed ? 1 : 0)
