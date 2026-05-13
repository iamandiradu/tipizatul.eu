#!/usr/bin/env node
/**
 * patch-orphan-orgs.mjs — backfill `organization` (and `county`) on Firestore
 * Template docs where the institution wasn't captured at upload time.
 *
 * For each rule below, any template with empty/missing `organization` whose
 * `name` matches the pattern gets the listed fields written. Add more rules
 * as more orphan templates surface; the script is idempotent.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (read from .env.local automatically).
 *
 * Usage
 * -----
 *   node scripts/edirect/patch-orphan-orgs.mjs --dry-run
 *   node scripts/edirect/patch-orphan-orgs.mjs
 */

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotenv({ path: resolve(__dirname, '../../.env.local') })
loadDotenv({ path: resolve(__dirname, '../../.env') })

const dryRun = process.argv.includes('--dry-run')

// Name-pattern → fields to patch. `county: 'Național'` parks a template in the
// National bucket explicitly, bypassing the org-name → Bucuresti routing.
const RULES = [
  {
    test: /^4\.\s*Cerere\s+emitere\s+certificat\s+membru\s+duplicat_\d+$/i,
    fields: { organization: 'Colegiul Farmaciștilor din România', county: 'Național' },
  },
]

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')
  try { return JSON.parse(raw) } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

async function main() {
  log(`${C.bold}patch-orphan-orgs.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}${C.reset}`)

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
  for (const doc of snap.docs) {
    const t = doc.data()
    if (t.organization && String(t.organization).trim()) continue
    for (const rule of RULES) {
      if (rule.test.test(t.name || '')) {
        todo.push({ id: doc.id, name: t.name, fields: rule.fields })
        break
      }
    }
  }

  log(`${C.bold}will patch ${todo.length} doc(s)${C.reset}`)
  for (const item of todo) {
    log(`  ${item.id}: "${item.name}" → ${JSON.stringify(item.fields)}`)
  }

  if (dryRun) {
    log(`${C.cyan}DRY-RUN: nothing written${C.reset}`)
    return
  }
  if (todo.length === 0) {
    log(`${C.dim}no matches — nothing to write${C.reset}`)
    return
  }

  const batch = db.batch()
  for (const item of todo) {
    batch.update(db.collection('templates').doc(item.id), item.fields)
  }
  await batch.commit()
  log(`${C.green}patched ${todo.length} doc(s)${C.reset}`)
}

main().catch((err) => {
  process.stderr.write(`${C.red}fatal:${C.reset} ${err?.stack || err}\n`)
  process.exit(1)
})
