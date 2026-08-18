#!/usr/bin/env node
/**
 * build-joins.mjs — resolve archetype-map.json (keyed by published file name)
 * into archetype-joins.json (keyed by archetype id, listing document ids).
 *
 * The map is written by hand, by file name, because that is what a person can
 * check against the institution's page. The join file is what
 * publish-archetypes.mjs consumes, and document ids are hashes — unreadable by
 * design. This script is the bridge, and it refuses to emit a partial answer:
 * a scraped document missing from the map, or a map entry naming a spec that
 * does not exist, fails the run.
 *
 * Usage
 *   node scripts/sources/dasm-cluj/build-joins.mjs
 *   node scripts/sources/dasm-cluj/build-joins.mjs --check   # verify, write nothing
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROCEDURES_PATH = resolve(__dirname, 'procedures.json')
const MAP_PATH = resolve(__dirname, 'archetype-map.json')
const OUT_PATH = resolve(__dirname, 'archetype-joins.json')
const SPECS_DIR = resolve(__dirname, '../../edirect/templates/specs')

const checkOnly = process.argv.includes('--check')

const C = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m' }
const log = (s = '') => process.stdout.write(s + '\n')

const payload = JSON.parse(readFileSync(PROCEDURES_PATH, 'utf-8'))
const map = JSON.parse(readFileSync(MAP_PATH, 'utf-8')).documents

const fileNameOf = (url) => decodeURIComponent(new URL(url).pathname.split('/').pop())

// doc id -> { fileName, name, procedures[] }, deduped: the same file backs
// several rows on the page (the VMI annex alone backs four).
const docs = new Map()
for (const proc of Object.values(payload.procedures)) {
  for (const d of proc.documents) {
    const entry = docs.get(d.eDirectDocId) ?? {
      fileName: fileNameOf(d.downloadUrl),
      name: d.name,
      procedures: [],
    }
    entry.procedures.push(proc.procedureId)
    docs.set(d.eDirectDocId, entry)
  }
}

const problems = []
const byArchetype = new Map()
const downloadOnly = new Map()

for (const [docId, d] of docs) {
  const entry = map[d.fileName]
  if (!entry) {
    problems.push(`untriaged document: ${d.fileName} (${docId}, "${d.name}") — add it to archetype-map.json`)
    continue
  }
  if (entry.archetype) {
    if (!existsSync(resolve(SPECS_DIR, `${entry.archetype}.mjs`))) {
      problems.push(`${d.fileName} → unknown spec "${entry.archetype}"`)
      continue
    }
    const bucket = byArchetype.get(entry.archetype) ?? { docIds: [], documents: [] }
    bucket.docIds.push(docId)
    bucket.documents.push(d.fileName)
    byArchetype.set(entry.archetype, bucket)
  } else if (entry.downloadOnly) {
    const bucket = downloadOnly.get(entry.downloadOnly) ?? []
    bucket.push(d.fileName)
    downloadOnly.set(entry.downloadOnly, bucket)
  } else {
    problems.push(`${d.fileName}: entry has neither "archetype" nor "downloadOnly"`)
  }
}

// A map entry that no longer matches any scraped document means the
// institution renamed or withdrew the file — worth knowing before the joins
// silently shrink.
const scrapedNames = new Set([...docs.values()].map((d) => d.fileName))
for (const fileName of Object.keys(map)) {
  if (!scrapedNames.has(fileName)) {
    problems.push(`stale map entry: ${fileName} is no longer on the page`)
  }
}

if (problems.length) {
  for (const p of problems) log(`${C.red}✗${C.reset} ${p}`)
  process.exit(1)
}

const archetypes = {}
for (const [id, v] of [...byArchetype.entries()].sort()) {
  archetypes[id] = {
    docIds: [...new Set(v.docIds)].sort(),
    documents: [...new Set(v.documents)].sort(),
    files: new Set(v.docIds).size,
  }
}

const out = {
  note:
    'Joins between the authored archetypes and the DASM Cluj-Napoca documents they replicate. ' +
    'Generated from archetype-map.json by build-joins.mjs — edit the map, not this file. ' +
    'Same evidence standard as manifest/authored-joins.json: each replica was written from the ' +
    'document it serves.',
  source: payload.source,
  institution: payload.institution,
  county: payload.county,
  archetypes,
  downloadOnly: Object.fromEntries([...downloadOnly.entries()].map(([k, v]) => [k, v.sort()])),
}

const joinedDocs = Object.values(archetypes).reduce((n, a) => n + a.files, 0)
const heldDocs = [...downloadOnly.values()].reduce((n, v) => n + v.length, 0)

log(`${C.green}✓${C.reset} ${Object.keys(archetypes).length} archetypes · ${joinedDocs} documents joined`)
for (const [reason, files] of downloadOnly) {
  log(`${C.dim}  download-only (${reason}): ${files.length}${C.reset}`)
}
log(`${C.dim}  ${joinedDocs}/${joinedDocs + heldDocs} of the scraped documents are editable${C.reset}`)

if (checkOnly) {
  log(`${C.dim}--check: nothing written${C.reset}`)
} else {
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8')
  log(`${C.green}wrote${C.reset} ${OUT_PATH}`)
}
