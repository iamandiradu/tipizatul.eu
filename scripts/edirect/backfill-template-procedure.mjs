#!/usr/bin/env node
/**
 * backfill-template-procedure.mjs — set procedureId + eDirectDocId on
 * existing Templates so the procedure detail page can pair its documents
 * with the editable forms we already uploaded.
 *
 * The eDirect doc id was baked into the bundle filename (`<name>_<id>.pdf`)
 * but stripped during the original upload because the user-facing template
 * name shouldn't carry it. Recover the id by parsing each entry in
 * `upload-templates-progress.json` (an authoritative mapping from local
 * stem → Firestore templateId) and joining `index.json` for procedureId.
 *
 * The progress file is preferred over a name-based join because many forms
 * inside one institution share the same name ("Cerere", "Anexa 1", etc.) —
 * matching by name is ambiguous, matching by stem is 1:1.
 *
 * Defaults to dry-run. Pass --commit to actually write to Firestore.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore).
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROGRESS_PATH = resolve(__dirname, 'upload-templates-progress.json')
const INDEX_PATH = resolve(__dirname, 'index.json')

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

// Stem trailing `_<digits>` is the eDirect listing record id baked in by
// the bundle downloader; same key procedure documents carry.
function eDirectDocIdFromStem(stem) {
  const m = /_(\d+)$/.exec(stem)
  return m ? m[1] : null
}

function buildDocIdMap() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error(`index.json not found at ${INDEX_PATH}`)
  }
  const idx = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
  const entries = Array.isArray(idx) ? idx : (idx.entries || [])
  const map = new Map()
  for (const e of entries) {
    if (!e.id || !e.procedureId) continue
    const k = String(e.id)
    if (!map.has(k)) {
      map.set(k, {
        procedureId: String(e.procedureId),
        procedure: e.procedure || undefined,
      })
    }
  }
  return map
}

async function main() {
  log(`${C.bold}backfill-template-procedure.mjs${C.reset}${C.dim} — ${commit ? 'LIVE (--commit)' : 'DRY-RUN'}${C.reset}`)

  if (!existsSync(PROGRESS_PATH)) {
    throw new Error(`progress file not found at ${PROGRESS_PATH}`)
  }
  const progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
  const uploaded = progress.uploaded || {}
  log(`${C.dim}progress: ${Object.keys(uploaded).length} uploaded entries${C.reset}`)

  const docIdMap = buildDocIdMap()
  log(`${C.dim}index.json: ${docIdMap.size} doc-ids with procedureId${C.reset}`)

  // Build templateId → patch from the progress file.
  const patches = new Map()
  let noTemplateId = 0
  let noStemId = 0
  let noIndexHit = 0
  for (const [key, val] of Object.entries(uploaded)) {
    if (!val?.templateId) {
      noTemplateId++
      continue
    }
    const slashIdx = key.indexOf('/')
    const stem = slashIdx >= 0 ? key.slice(slashIdx + 1) : key
    const eDirectDocId = eDirectDocIdFromStem(stem)
    if (!eDirectDocId) {
      noStemId++
      if (verbose && noStemId <= 3) log(`${C.dim}  stem missing _<id>: ${stem}${C.reset}`)
      continue
    }
    const proc = docIdMap.get(eDirectDocId)
    if (!proc) {
      noIndexHit++
      if (verbose && noIndexHit <= 3) log(`${C.dim}  id ${eDirectDocId} not in index.json (stem ${stem})${C.reset}`)
      continue
    }
    patches.set(val.templateId, {
      eDirectDocId,
      procedureId: proc.procedureId,
      ...(proc.procedure ? { procedure: proc.procedure } : {}),
    })
  }
  log()
  log(`${C.bold}derived patch set${C.reset}`)
  log(`  patches:           ${patches.size}`)
  log(`  no templateId:     ${noTemplateId}`)
  log(`  no stem-id:        ${noStemId}`)
  log(`  no index match:    ${noIndexHit}`)
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

  // Skip templates that are already set or that no longer exist. Cheap to
  // scan since we read the whole collection anyway for the catalog rebuild.
  const snap = await db.collection('templates').get()
  const existing = new Map(snap.docs.map((d) => [d.id, d.data()]))
  log(`${C.dim}firestore: ${snap.size} template docs${C.reset}`)

  let alreadySet = 0
  let missing = 0
  const toWrite = []
  for (const [tid, patch] of patches) {
    const t = existing.get(tid)
    if (!t) { missing++; continue }
    if (
      t.eDirectDocId === patch.eDirectDocId &&
      t.procedureId === patch.procedureId
    ) {
      alreadySet++
      continue
    }
    toWrite.push({ id: tid, patch })
  }

  log(`${C.bold}firestore reconciliation${C.reset}`)
  log(`  already set:    ${alreadySet}`)
  log(`  to patch:       ${toWrite.length}`)
  log(`  templateId not in firestore (orphan progress): ${missing}`)
  log()

  if (!commit) {
    log(`${C.cyan}DRY-RUN: nothing written. Re-run with --commit to apply.${C.reset}`)
    if (toWrite.length > 0) {
      log(`${C.dim}sample patches:${C.reset}`)
      for (const w of toWrite.slice(0, 5)) {
        log(`  ${w.id} → ${JSON.stringify(w.patch)}`)
      }
    }
    return
  }

  // Firestore batched writes cap at 500 ops. Chunk accordingly.
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
