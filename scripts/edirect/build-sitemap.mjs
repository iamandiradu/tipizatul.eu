#!/usr/bin/env node
/**
 * build-sitemap.mjs — generate public/sitemap.xml from the slim catalog.
 *
 * Reads `catalog/index` from Firestore (the same slim aggregate the homepage
 * uses) and writes a sitemap with the homepage + every active form URL. Run
 * this whenever the catalog changes — typically right after
 * `build-catalog-index.mjs`. The output is committed to git so Vercel deploys
 * always ship a recent sitemap without needing Firestore access at build time.
 *
 * Env vars: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore).
 *
 * Usage
 * -----
 *   node scripts/edirect/build-sitemap.mjs
 *   node scripts/edirect/build-sitemap.mjs --base https://tipizatul.eu
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SITEMAP_OUT = resolve(__dirname, '../../public/sitemap.xml')

const args = process.argv.slice(2)
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : fallback
}
const SITE_BASE = (getArg('base', 'https://tipizatul.eu') || '').replace(/\/$/, '')

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

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function decompressIfNeeded(data) {
  if (data.encoding !== 'gzip+json') {
    return data.templates ?? []
  }
  const blob = data.compressed
  let bytes
  if (blob && typeof blob.toUint8Array === 'function') {
    bytes = blob.toUint8Array()
  } else if (Buffer.isBuffer(blob)) {
    bytes = blob
  } else {
    bytes = Buffer.from(blob)
  }
  const json = gunzipSync(Buffer.from(bytes)).toString('utf-8')
  return JSON.parse(json)
}

async function main() {
  log(`${C.bold}build-sitemap.mjs${C.reset}${C.dim} — base=${SITE_BASE}${C.reset}`)

  const credentials = parseServiceAccount()
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  const db = admin.firestore()

  const snap = await db.collection('catalog').doc('index').get()
  if (!snap.exists) {
    throw new Error('catalog/index doc does not exist — run build-catalog-index.mjs first')
  }
  const data = snap.data()
  const templates = decompressIfNeeded(data)
  const active = templates.filter((t) => !t.archived)
  log(`${C.dim}catalog: ${templates.length} total, ${active.length} active${C.reset}`)

  // Use the catalog's generatedAt as <lastmod> for every URL — accurate enough
  // for crawlers and avoids per-template metadata we don't have.
  const lastmod = (data.generatedAt || new Date().toISOString()).slice(0, 10)

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>']
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

  lines.push('  <url>')
  lines.push(`    <loc>${SITE_BASE}/</loc>`)
  lines.push(`    <lastmod>${lastmod}</lastmod>`)
  lines.push('    <changefreq>daily</changefreq>')
  lines.push('    <priority>1.0</priority>')
  lines.push('  </url>')

  for (const t of active) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(`${SITE_BASE}/fill/${t.id}`)}</loc>`)
    lines.push(`    <lastmod>${lastmod}</lastmod>`)
    lines.push('    <changefreq>monthly</changefreq>')
    lines.push('    <priority>0.7</priority>')
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  const xml = lines.join('\n') + '\n'

  writeFileSync(SITEMAP_OUT, xml, 'utf-8')
  log(`${C.green}wrote${C.reset} ${SITEMAP_OUT}`)
  log(`${C.dim}entries: ${active.length + 1} (homepage + forms)${C.reset}`)
  log(`${C.dim}size: ${(xml.length / 1024).toFixed(1)} KB${C.reset}`)
}

main().catch((err) => {
  process.stderr.write(`${C.red}fatal:${C.reset} ${err?.stack || err}\n`)
  process.exit(1)
})
