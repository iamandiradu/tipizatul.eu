#!/usr/bin/env node
/**
 * download.mjs — pull every document listed in procedures.json to
 * `downloads/<docId>.<ext>` (gitignored).
 *
 * These are the working copies the replica specs are authored FROM, and the
 * bytes mirror-documents.mjs would upload. Mirrors download.mjs in
 * scripts/edirect/: resume by presence on disk, sequential, polite.
 *
 * Usage
 *   node scripts/sources/dasm-cluj/download.mjs
 *   node scripts/sources/dasm-cluj/download.mjs --force
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_PATH = resolve(__dirname, 'procedures.json')
const OUT_DIR = resolve(__dirname, 'downloads')

const force = process.argv.includes('--force')

const C = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m', red: '\x1b[31m' }
const log = (s = '') => process.stdout.write(s + '\n')

const payload = JSON.parse(readFileSync(SRC_PATH, 'utf-8'))
const byId = new Map()
for (const p of Object.values(payload.procedures)) {
  for (const d of p.documents) {
    if (!byId.has(d.eDirectDocId)) byId.set(d.eDirectDocId, d)
  }
}

mkdirSync(OUT_DIR, { recursive: true })
let ok = 0, skipped = 0, failed = 0

for (const [id, d] of byId) {
  const ext = d.sourceExt || 'bin'
  const out = resolve(OUT_DIR, `${id}.${ext}`)
  if (existsSync(out) && !force) { skipped++; continue }
  try {
    const res = await fetch(d.downloadUrl, {
      headers: { 'user-agent': 'tipizatul.eu scraper (+https://tipizatul.eu)' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(out, buf)
    ok++
    log(`${C.green}OK${C.reset}   ${id}.${ext} ${C.dim}${(buf.length / 1024).toFixed(0)} KB · ${d.name}${C.reset}`)
  } catch (err) {
    failed++
    log(`${C.red}FAIL${C.reset} ${id}.${ext} ${C.dim}${d.downloadUrl}${C.reset} — ${err.message}`)
  }
}

log(`\ndone. downloaded=${ok} skipped=${skipped} failed=${failed} (${byId.size} unique documents)`)
