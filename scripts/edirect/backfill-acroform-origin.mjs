#!/usr/bin/env node
/**
 * backfill-acroform-origin.mjs — stamp `acroFormOrigin` on every Template
 * by joining the local AcroForm scan (scripts/edirect/llm/acroform-scan.json,
 * produced by scan_acroform.py) with the upload progress file.
 *
 * For each uploaded template we recover its eDirect doc id from the bundle
 * stem (the trailing `_<digits>`) and look the matching source PDF up in
 * acroform-scan.json:
 *
 *   source PDF in `original_paths`  → template.acroFormOrigin = 'original'
 *   anything else                   → template.acroFormOrigin = 'generated'
 *
 * "Generated" here covers two populations that look the same to consumers
 * downstream: (a) plain source PDFs whose AcroForm came from our detection
 * pipeline, and (b) source PDFs that were *already* AcroForm but whose
 * widgets were produced by pdf-lib (our pipeline) in a previous round. Both
 * need manual review before they can be surfaced via the "doar formulare
 * oficiale completabile" filter on /proceduri.
 *
 * Defaults to dry-run. Pass --commit to actually write to Firestore.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore).
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROGRESS_PATH = resolve(__dirname, 'upload-templates-progress.json')
const SCAN_PATH = resolve(__dirname, 'llm', 'acroform-scan.json')

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const verbose = args.includes('-v') || args.includes('--verbose')

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')
  try { return JSON.parse(raw) } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

function eDirectDocIdFromStem(stem) {
  const m = /_(\d+)$/.exec(stem)
  return m ? m[1] : null
}

// Build the {eDirectDocId → origin} map from the scan.
//
// Collisions (same docId on multiple source PDFs) get reported but we only
// keep the first 'original' assignment — if any source PDF behind a docId is
// original, we treat templates carrying that docId as original. That's the
// conservative direction: never *upgrade* a generated template to original,
// only ever downgrade.
function buildDocIdOriginMap(scan) {
  const map = new Map() // docId → 'original' | 'generated'
  const collisions = []

  const tag = (path, kind) => {
    const docId = eDirectDocIdFromStem(basename(path, '.pdf'))
    if (!docId) return
    const prior = map.get(docId)
    if (prior === undefined) {
      map.set(docId, kind)
      return
    }
    if (prior !== kind) {
      collisions.push({ docId, was: prior, now: kind, path })
      if (kind === 'original') map.set(docId, 'original')
    }
  }

  for (const p of scan.original_paths || []) tag(p, 'original')
  for (const p of scan.pipeline_paths || []) tag(p, 'generated')
  // Pure plain PDFs aren't in either list explicitly — they're inferred
  // below from the absence of a docId in this map (treated as 'generated').

  return { map, collisions }
}

async function main() {
  log(`${C.bold}backfill-acroform-origin.mjs${C.reset}${C.dim} — ${commit ? 'LIVE (--commit)' : 'DRY-RUN'}${C.reset}`)

  if (!existsSync(PROGRESS_PATH)) {
    throw new Error(`progress file not found at ${PROGRESS_PATH}`)
  }
  if (!existsSync(SCAN_PATH)) {
    throw new Error(`acroform scan not found at ${SCAN_PATH} — run scripts/edirect/llm/scan_acroform.py first`)
  }
  const progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
  const uploaded = progress.uploaded || {}
  log(`${C.dim}progress: ${Object.keys(uploaded).length} uploaded entries${C.reset}`)

  const scan = JSON.parse(readFileSync(SCAN_PATH, 'utf-8'))
  const { map: docIdOrigin, collisions } = buildDocIdOriginMap(scan)
  log(`${C.dim}scan:     ${scan.acroform_original ?? '?'} original + ${scan.acroform_pipeline ?? '?'} pipeline = ${docIdOrigin.size} doc-ids classified${C.reset}`)
  if (collisions.length) {
    log(`${C.yellow}warn:${C.reset} ${collisions.length} doc-id collisions across scan categories (kept 'original' where any source was original)`)
    if (verbose) for (const c of collisions.slice(0, 5)) log(`  ${c.docId}: ${c.was} → ${c.now} (${basename(c.path)})`)
  }

  // Derive the patch set from the progress file. Anything without a
  // recognisable doc id is skipped (we'd never be sure of its origin).
  const patches = new Map()
  let noTemplateId = 0
  let noStemId = 0
  let countsByOrigin = { original: 0, generated: 0 }
  for (const [key, val] of Object.entries(uploaded)) {
    if (!val?.templateId) { noTemplateId++; continue }
    const slashIdx = key.indexOf('/')
    const stem = slashIdx >= 0 ? key.slice(slashIdx + 1) : key
    const docId = eDirectDocIdFromStem(stem)
    if (!docId) {
      noStemId++
      if (verbose && noStemId <= 3) log(`${C.dim}  stem missing _<id>: ${stem}${C.reset}`)
      continue
    }
    const origin = docIdOrigin.get(docId) === 'original' ? 'original' : 'generated'
    countsByOrigin[origin]++
    patches.set(val.templateId, { acroFormOrigin: origin })
  }
  log()
  log(`${C.bold}derived patch set${C.reset}`)
  log(`  patches:           ${patches.size}`)
  log(`    → original:      ${countsByOrigin.original}`)
  log(`    → generated:     ${countsByOrigin.generated}`)
  log(`  no templateId:     ${noTemplateId}`)
  log(`  no stem-id:        ${noStemId}`)
  log()

  if (patches.size === 0) {
    log(`${C.yellow}nothing to patch — exiting.${C.reset}`)
    return
  }

  const credentials = parseServiceAccount()
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  const db = admin.firestore()

  const snap = await db.collection('templates').get()
  const existing = new Map(snap.docs.map((d) => [d.id, d.data()]))
  log(`${C.dim}firestore: ${snap.size} template docs${C.reset}`)

  let alreadySet = 0
  let missing = 0
  const toWrite = []
  for (const [tid, patch] of patches) {
    const t = existing.get(tid)
    if (!t) { missing++; continue }
    if (t.acroFormOrigin === patch.acroFormOrigin) {
      alreadySet++
      continue
    }
    toWrite.push({ id: tid, patch, was: t.acroFormOrigin })
  }

  // Break out the writes by kind so the dry-run summary is informative.
  const byKind = { original: 0, generated: 0 }
  for (const w of toWrite) byKind[w.patch.acroFormOrigin]++

  log(`${C.bold}firestore reconciliation${C.reset}`)
  log(`  already set:    ${alreadySet}`)
  log(`  to patch:       ${toWrite.length}`)
  log(`    → original:   ${byKind.original}`)
  log(`    → generated:  ${byKind.generated}`)
  log(`  templateId not in firestore (orphan progress): ${missing}`)
  log()

  if (!commit) {
    log(`${C.cyan}DRY-RUN: nothing written. Re-run with --commit to apply.${C.reset}`)
    if (toWrite.length > 0) {
      const origSamples = toWrite.filter((w) => w.patch.acroFormOrigin === 'original').slice(0, 5)
      if (origSamples.length) {
        log(`${C.dim}sample 'original' patches:${C.reset}`)
        for (const w of origSamples) log(`  ${w.id} (was ${w.was ?? 'unset'}) → original`)
      }
    }
    return
  }

  const CHUNK = 400
  let written = 0
  for (let i = 0; i < toWrite.length; i += CHUNK) {
    const slice = toWrite.slice(i, i + CHUNK)
    const batch = db.batch()
    for (const w of slice) {
      batch.set(db.collection('templates').doc(w.id), w.patch, { merge: true })
    }
    await batch.commit()
    written += slice.length
    log(`${C.dim}  wrote ${written}/${toWrite.length}${C.reset}`)
  }
  log(`${C.bold}${C.green}done.${C.reset} ${written} templates patched.`)
  log(`${C.yellow}reminder:${C.reset} run \`build-catalog-index.mjs\` next so the catalog cache picks up the new fields.`)
}

main().catch((err) => {
  process.stderr.write(`${C.red}fatal:${C.reset} ${err?.stack || err}\n`)
  process.exit(1)
})
