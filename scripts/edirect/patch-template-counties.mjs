#!/usr/bin/env node
/**
 * patch-template-counties.mjs — backfill the `county` field on Firestore
 * Template docs whose institution didn't carry a county at upload time.
 *
 * For each template doc with empty/missing `county`, derive the county from
 * the organization name using `lib/locality-county.mjs`. National-institution
 * patterns (Ministerul, Agentia Nationala, Bucharest sectors, ...) map to
 * "Bucuresti"; locality tokens map to their county; everything else stays
 * untouched.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore).
 *
 * Usage
 * -----
 *   node scripts/edirect/patch-template-counties.mjs --dry-run
 *   node scripts/edirect/patch-template-counties.mjs
 *   node scripts/edirect/patch-template-counties.mjs --limit 100
 */

import admin from 'firebase-admin'
import { deriveCountyFromOrg } from './lib/locality-county.mjs'

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const limit = parseInt(getArg('limit') ?? '0', 10) || Infinity

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')
const logErr = (s) => process.stderr.write(s + '\n')

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')
  try { return JSON.parse(raw) } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

async function main() {
  log(`${C.bold}patch-template-counties.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}${C.reset}`)

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

  const todo = []
  const stats = { hadCounty: 0, derivedCounty: 0, stillMissing: 0 }
  const distribution = {}
  const stillMissingExamples = []

  for (const doc of snap.docs) {
    const t = doc.data()
    if (t.county && String(t.county).trim()) {
      stats.hadCounty++
      continue
    }
    const derived = deriveCountyFromOrg(t.organization || '', null)
    if (!derived) {
      stats.stillMissing++
      if (stillMissingExamples.length < 10) {
        stillMissingExamples.push(t.organization || `(no organization, name=${t.name})`)
      }
      continue
    }
    stats.derivedCounty++
    distribution[derived] = (distribution[derived] || 0) + 1
    todo.push({ id: t.id, organization: t.organization, county: derived })
  }

  log()
  log(`${C.bold}plan${C.reset}`)
  log(`  already had county: ${stats.hadCounty}`)
  log(`  ${C.green}will set county${C.reset}:    ${stats.derivedCounty}`)
  log(`  still missing:      ${stats.stillMissing}`)
  if (stats.stillMissing > 0) {
    log(`${C.yellow}  examples of still-missing:${C.reset}`)
    stillMissingExamples.forEach((s) => log(`    - ${s}`))
  }
  log()
  log(`${C.bold}county distribution of patches${C.reset}`)
  Object.entries(distribution).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    log(`  ${c.padEnd(20)} ${n}`)
  })

  const queue = todo.slice(0, limit)
  if (queue.length < todo.length) {
    log(`${C.dim}(limited to ${limit})${C.reset}`)
  }

  if (dryRun) {
    log()
    log(`${C.cyan}DRY-RUN: ${queue.length} doc(s) would be patched, nothing written${C.reset}`)
    return
  }

  log()
  log(`${C.bold}writing ${queue.length} patches…${C.reset}`)

  // Firestore batched writes: 500 ops per batch.
  let written = 0, failed = 0
  for (let i = 0; i < queue.length; i += 400) {
    const slice = queue.slice(i, i + 400)
    const batch = db.batch()
    for (const item of slice) {
      batch.update(db.collection('templates').doc(item.id), { county: item.county })
    }
    try {
      await batch.commit()
      written += slice.length
      log(`  ${C.green}batch ok${C.reset}: ${written}/${queue.length}`)
    } catch (err) {
      failed += slice.length
      logErr(`  ${C.red}batch failed${C.reset}: ${err?.message || err}`)
    }
  }

  log()
  log(`${C.bold}done.${C.reset} written=${written} failed=${failed}`)
}

main().catch((err) => {
  logErr(`${C.red}fatal:${C.reset} ${err?.stack || err}`)
  process.exit(1)
})
