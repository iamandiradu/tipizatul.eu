#!/usr/bin/env node
/**
 * backfill-template-procedure.mjs — set procedureId + eDirectDocId on
 * existing Templates so the procedure detail page can pair its documents
 * with the editable forms we already uploaded.
 *
 * The eDirect doc id was baked into the bundle filename (`<name>_<id>.pdf`)
 * but stripped during the original upload because the user-facing template
 * name shouldn't carry it. This script walks `bundles/` to recover the id,
 * joins index.json to find the procedureId, and patches each template by
 * matching on (name, organization).
 *
 * Defaults to dry-run. Pass --commit to actually write to Firestore.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUNDLES_ROOT = resolve(__dirname, 'bundles')
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

function deriveTemplateName(stem) {
  // Mirror upload-templates.mjs::deriveTemplateName so backfill matches
  // exactly the same name we wrote at upload time.
  return stem.replace(/_\d+$/, '').replace(/_/g, ' ').trim()
}

function eDirectDocIdFromStem(stem) {
  const m = /_(\d+)$/.exec(stem)
  return m ? m[1] : null
}

// Walks bundles/{batch}/{institution}/<stem>_<id>.pdf and yields one
// candidate { stem, eDirectDocId, organization, bundleDir } per file.
function* walkBundles() {
  if (!existsSync(BUNDLES_ROOT)) {
    throw new Error(`bundles/ root not found at ${BUNDLES_ROOT}`)
  }
  for (const batch of readdirSync(BUNDLES_ROOT)) {
    const batchPath = join(BUNDLES_ROOT, batch)
    if (!statSync(batchPath).isDirectory()) continue
    if (batch === 'processed') continue
    for (const org of readdirSync(batchPath)) {
      const orgPath = join(batchPath, org)
      if (!statSync(orgPath).isDirectory()) continue
      for (const file of readdirSync(orgPath)) {
        if (!file.endsWith('.pdf')) continue
        const stem = file.slice(0, -'.pdf'.length)
        const eDirectDocId = eDirectDocIdFromStem(stem)
        if (!eDirectDocId) continue
        yield {
          stem,
          eDirectDocId,
          organization: org,
          bundleDir: batch,
          name: deriveTemplateName(stem),
        }
      }
    }
  }
}

function buildDocIdMap() {
  const map = new Map()
  if (!existsSync(INDEX_PATH)) {
    throw new Error(`index.json not found at ${INDEX_PATH}`)
  }
  const idx = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
  const entries = Array.isArray(idx) ? idx : (idx.entries || [])
  for (const e of entries) {
    if (!e.id || !e.procedureId) continue
    map.set(String(e.id), {
      procedureId: String(e.procedureId),
      procedure: e.procedure || undefined,
    })
  }
  return map
}

async function main() {
  log(`${C.bold}backfill-template-procedure.mjs${C.reset}${C.dim} — ${commit ? 'LIVE (--commit)' : 'DRY-RUN'}${C.reset}`)

  const docIdMap = buildDocIdMap()
  log(`${C.dim}index.json: ${docIdMap.size} doc-ids with procedureId${C.reset}`)

  // Build (name, organization) → { eDirectDocId, procedureId, procedure }
  // from disk. Skip ambiguous keys (same name+org with conflicting doc-ids)
  // since we can't be confident which template they map to.
  const byKey = new Map()
  let walked = 0
  let skippedNoMatch = 0
  for (const f of walkBundles()) {
    walked++
    const proc = docIdMap.get(f.eDirectDocId)
    if (!proc) {
      skippedNoMatch++
      continue
    }
    const key = `${f.organization}::${f.name}`
    const cur = byKey.get(key)
    if (!cur) {
      byKey.set(key, { ...f, ...proc, conflicts: 0 })
    } else if (cur.eDirectDocId !== f.eDirectDocId) {
      // Two distinct files map to the same (name, organization). We can't
      // safely pick one — bump the conflict counter so we skip later.
      cur.conflicts = (cur.conflicts || 0) + 1
    }
  }
  log(`${C.dim}bundles: ${walked} pdfs · keys ${byKey.size} · skipped (no index match): ${skippedNoMatch}${C.reset}`)

  const credentials = parseServiceAccount()
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  const db = admin.firestore()
  const snap = await db.collection('templates').get()
  log(`${C.dim}firestore: ${snap.size} template docs${C.reset}`)

  let toWrite = []
  let alreadySet = 0
  let noMatch = 0
  let ambiguous = 0
  for (const doc of snap.docs) {
    const t = doc.data()
    if (t.archived) continue
    if (t.eDirectDocId && t.procedureId) {
      alreadySet++
      continue
    }
    const key = `${t.organization || ''}::${t.name}`
    const hit = byKey.get(key)
    if (!hit) {
      noMatch++
      if (verbose) log(`${C.dim}  no bundle match: ${key}${C.reset}`)
      continue
    }
    if (hit.conflicts > 0) {
      ambiguous++
      if (verbose) log(`${C.yellow}  ambiguous (${hit.conflicts + 1} bundles): ${key}${C.reset}`)
      continue
    }
    toWrite.push({
      id: doc.id,
      patch: {
        eDirectDocId: hit.eDirectDocId,
        procedureId: hit.procedureId,
        ...(hit.procedure ? { procedure: hit.procedure } : {}),
      },
    })
  }

  log()
  log(`${C.bold}match summary${C.reset}`)
  log(`  already set:   ${alreadySet}`)
  log(`  to patch:      ${toWrite.length}`)
  log(`  no match:      ${noMatch}`)
  log(`  ambiguous:     ${ambiguous}`)
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
