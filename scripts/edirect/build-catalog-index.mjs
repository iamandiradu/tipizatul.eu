#!/usr/bin/env node
/**
 * build-catalog-index.mjs — build the slim `catalog/index` aggregate doc.
 *
 * The homepage and admin list need lightweight metadata for thousands of
 * templates without paying the cost of pulling every full template doc
 * (each one carries a `fields[]` array that adds up to 15-25 MB total).
 *
 * Two source modes:
 *
 *   default — read every doc in `templates`. Source of truth, exact
 *             field counts, picks up Admin-uploaded templates.
 *
 *   --from-local — reconstruct from `upload-templates-progress.json` plus the
 *                  detector `*.fields.json` files under `paddle/output/`.
 *                  Zero Firestore reads, useful when the daily quota is
 *                  exhausted. Skips Admin-only templates and uses the
 *                  detector field count as an approximation. Run again in
 *                  Firestore mode later to get exact data.
 *
 * Either way, the result is one slim doc in `catalog/index`. If the JSON fits
 * in ~900 KB it's stored verbatim as `templates: SlimTemplate[]`; otherwise
 * the array is gzipped and stored as `compressed: Bytes`. The frontend
 * handles both shapes transparently.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore).
 *
 * Usage
 * -----
 *   node scripts/edirect/build-catalog-index.mjs                # from Firestore
 *   node scripts/edirect/build-catalog-index.mjs --from-local   # from local files
 *   node scripts/edirect/build-catalog-index.mjs --dry-run      # no write
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import admin from 'firebase-admin'
import { deriveCountyFromOrg } from './lib/locality-county.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROGRESS_PATH = resolve(__dirname, 'upload-templates-progress.json')
const OUTPUT_ROOT = resolve(__dirname, 'paddle/output')
const INDEX_PATH = resolve(__dirname, 'index.json')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fromLocal = args.includes('--from-local')

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')

// Firestore single-doc cap is 1 MiB. Leave headroom for envelope fields.
const INLINE_MAX_BYTES = 900_000

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')
  try { return JSON.parse(raw) } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

function slim(t) {
  const visibleFieldCount = Array.isArray(t.fields)
    ? t.fields.filter((f) => !f.hidden).length
    : 0
  const out = {
    id: t.id,
    name: t.name,
    driveFileId: t.driveFileId,
    visibleFieldCount,
    version: t.version || 1,
  }
  if (t.description) out.description = t.description
  if (t.category) out.category = t.category
  if (t.organization) out.organization = t.organization
  if (t.county) out.county = t.county
  if (t.archived) out.archived = true
  return out
}

// ── Local-file reconstruction (no Firestore reads) ───────────────────────────

function deriveTemplateName(stem) {
  return stem.replace(/_\d+$/, '').replace(/_/g, ' ').trim()
}

function organizationFromSource(source) {
  if (!source) return undefined
  const parts = source.split('/')
  if (parts.length < 2) return undefined
  return parts[parts.length - 2]
}

function buildCountyMap() {
  const map = new Map()
  if (!existsSync(INDEX_PATH)) return map
  const idx = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
  const entries = Array.isArray(idx) ? idx : (idx.entries || [])
  for (const e of entries) {
    if (e.institution && e.county && !map.has(e.institution)) {
      map.set(e.institution, e.county)
    }
  }
  return map
}

function buildSlimFromLocal() {
  if (!existsSync(PROGRESS_PATH)) {
    throw new Error(`progress file not found at ${PROGRESS_PATH}`)
  }
  const progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
  const uploaded = progress.uploaded || {}
  const countyMap = buildCountyMap()

  const slim = []
  let missingFiles = 0
  for (const [key, val] of Object.entries(uploaded)) {
    const slashIdx = key.indexOf('/')
    const bundleDir = key.slice(0, slashIdx)
    const stem = key.slice(slashIdx + 1)
    const jsonPath = join(OUTPUT_ROOT, bundleDir, `${stem}.fields.json`)

    let detector = null
    try {
      detector = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    } catch {
      missingFiles++
    }

    const organization = detector ? organizationFromSource(detector.source) : undefined
    const county =
      (organization && countyMap.get(organization)) ||
      deriveCountyFromOrg(organization || '', null)
    const fieldCount = detector && Array.isArray(detector.fields)
      ? detector.fields.length
      : 0

    const entry = {
      id: val.templateId,
      name: deriveTemplateName(stem),
      driveFileId: val.driveFileId,
      visibleFieldCount: fieldCount,
      version: 1,
    }
    if (organization) entry.organization = organization
    if (county) entry.county = county
    slim.push(entry)
  }

  if (missingFiles > 0) {
    log(`${C.yellow}warning:${C.reset} ${missingFiles} entries had no detector .fields.json (entry kept with fieldCount=0)`)
  }
  return slim
}

async function main() {
  const mode = fromLocal ? 'LOCAL' : 'FIRESTORE'
  log(`${C.bold}build-catalog-index.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'} · source=${mode}${C.reset}`)

  const credentials = parseServiceAccount()
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  const db = admin.firestore()

  let templates
  if (fromLocal) {
    templates = buildSlimFromLocal()
    log(`${C.dim}local: ${templates.length} entries from progress + detector files${C.reset}`)
  } else {
    const snap = await db.collection('templates').get()
    log(`${C.dim}firestore: ${snap.size} template docs${C.reset}`)
    templates = snap.docs.map((d) => slim(d.data()))
  }
  templates.sort((a, b) => a.name.localeCompare(b.name, 'ro'))

  const json = JSON.stringify(templates)
  const generatedAt = new Date().toISOString()
  log(`${C.dim}slim json: ${json.length.toLocaleString()} bytes${C.reset}`)

  let payload
  if (json.length <= INLINE_MAX_BYTES) {
    payload = {
      encoding: 'json',
      templates,
      count: templates.length,
      generatedAt,
    }
    log(`${C.green}storing inline${C.reset} (under ${INLINE_MAX_BYTES.toLocaleString()} bytes)`)
  } else {
    const compressed = gzipSync(Buffer.from(json, 'utf-8'))
    log(`${C.dim}gzipped: ${compressed.length.toLocaleString()} bytes${C.reset}`)
    if (compressed.length > 1_000_000) {
      throw new Error(`compressed payload ${compressed.length} bytes exceeds Firestore 1MB limit — split by county instead`)
    }
    payload = {
      encoding: 'gzip+json',
      compressed,
      count: templates.length,
      generatedAt,
    }
    log(`${C.green}storing compressed${C.reset}`)
  }

  if (dryRun) {
    log(`${C.cyan}DRY-RUN: nothing written${C.reset}`)
    return
  }

  await db.collection('catalog').doc('index').set(payload)
  log(`${C.bold}done.${C.reset} catalog/index updated (${templates.length} templates)`)
}

main().catch((err) => {
  process.stderr.write(`${C.red}fatal:${C.reset} ${err?.stack || err}\n`)
  process.exit(1)
})
