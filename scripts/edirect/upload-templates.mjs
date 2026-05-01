#!/usr/bin/env node
/**
 * upload-templates.mjs — batch upload of AcroForm PDFs to tipizatul.eu.
 *
 * Walks `scripts/edirect/paddle/output/bundle-{100..800}/`, uploads each
 * `<stem>.pdf` to Google Drive under `Tipizatul.eu/PDFs/`, makes it public,
 * introspects the AcroForm via `pdf-lib`, builds a `Template` document and
 * writes it to Firestore (`templates/<id>`).
 *
 * Companion `<stem>.fields.json` files (detector output) are read for
 * `avgConfidence` and to derive the institution from `source` parent dir.
 * `index.json` provides the institution → county map.
 *
 * Prerequisites
 * -------------
 *   1. `npm install`  — pulls `googleapis` and `firebase-admin` (already in
 *      package.json).
 *   2. Env var `GOOGLE_SERVICE_ACCOUNT_KEY` — service-account JSON (raw or
 *      base64). Used for Firestore. Needs Cloud Datastore User role (or
 *      equivalent) on the same project as the Firestore database.
 *   3. Env var `GOOGLE_OAUTH_CLIENT_KEY` — OAuth 2.0 Desktop client JSON.
 *      Used for Drive uploads so files land in *your* Drive (service accounts
 *      have no storage quota). Create one in Google Cloud Console →
 *      "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth
 *      client ID" → "Desktop app". Accepts raw JSON, base64, or a file path.
 *      First run opens a browser to consent; the resulting token is cached at
 *      `scripts/edirect/.oauth-token.json` (gitignored).
 *   4. Optional env var `FIREBASE_PROJECT_ID` — only needed if your service
 *      account JSON lacks `project_id` (it normally doesn't).
 *   5. Optional env var `FOLDER_ID_OVERRIDE` — Drive folder id to upload into.
 *      If unset, the script creates `Tipizatul.eu/PDFs` in your "My Drive".
 *
 * Usage
 * -----
 *   node scripts/edirect/upload-templates.mjs                # everything
 *   node scripts/edirect/upload-templates.mjs --dry-run      # report only
 *   node scripts/edirect/upload-templates.mjs --limit 50     # cap N
 *   node scripts/edirect/upload-templates.mjs --bundle 800   # one bundle
 *   node scripts/edirect/upload-templates.mjs --concurrency 4
 *
 * Resume
 * ------
 *   Progress is persisted to `upload-templates-progress.json`. On every
 *   successful upload, the row is appended + flushed. Re-running the script
 *   skips already-uploaded pairs. Delete the file to force a full re-upload.
 *
 * Dry-run skips Drive + Firestore writes but still introspects the PDF and
 * builds the Template object so you can verify the planned writes.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, createReadStream } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
} from 'pdf-lib'
import { google } from 'googleapis'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_ROOT = resolve(__dirname, 'paddle/output')
const INDEX_PATH = resolve(__dirname, 'index.json')
const PROGRESS_PATH = resolve(__dirname, 'upload-templates-progress.json')

const DRIVE_ROOT_NAME = 'Tipizatul.eu'
const DRIVE_PDFS_NAME = 'PDFs'
const FOLDER_ID_OVERRIDE = process.env.FOLDER_ID_OVERRIDE || null
const OAUTH_TOKEN_PATH = resolve(__dirname, '.oauth-token.json')
const OAUTH_LOOPBACK_PORT = parseInt(process.env.OAUTH_LOOPBACK_PORT || '53682', 10)
const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}`

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const limit = parseInt(getArg('limit') ?? '0', 10) || Infinity
const bundleOnly = getArg('bundle')
const concurrency = Math.max(1, parseInt(getArg('concurrency') ?? '1', 10))

// ── Pretty logging ───────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
}
function log(s = '') { process.stdout.write(s + '\n') }
function logErr(s) { process.stderr.write(s + '\n') }

// ── Service account / Auth ───────────────────────────────────────────────────

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    if (dryRun) return null
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var not set')
  }
  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
}

let _drive = null
let _firestore = null

function parseOAuthClient() {
  const raw = process.env.GOOGLE_OAUTH_CLIENT_KEY
  if (!raw) {
    if (dryRun) return null
    throw new Error('GOOGLE_OAUTH_CLIENT_KEY env var not set (Desktop OAuth client JSON, base64, or path)')
  }
  let json
  if (raw.trim().startsWith('{')) {
    json = JSON.parse(raw)
  } else if (existsSync(raw)) {
    json = JSON.parse(readFileSync(raw, 'utf-8'))
  } else {
    json = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
  // Google Console wraps credentials under "installed" (Desktop) or "web".
  const cfg = json.installed || json.web || json
  if (!cfg.client_id || !cfg.client_secret) {
    throw new Error('OAuth client JSON missing client_id/client_secret')
  }
  return cfg
}

function persistTokens(tokens) {
  const existing = existsSync(OAUTH_TOKEN_PATH)
    ? JSON.parse(readFileSync(OAUTH_TOKEN_PATH, 'utf-8'))
    : {}
  writeFileSync(OAUTH_TOKEN_PATH, JSON.stringify({ ...existing, ...tokens }, null, 2))
}

async function runConsentFlow(oauth) {
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  })

  const code = await new Promise((res, rej) => {
    const server = createServer((req, resp) => {
      const url = new URL(req.url, OAUTH_REDIRECT_URI)
      const c = url.searchParams.get('code')
      const err = url.searchParams.get('error')
      resp.writeHead(200, { 'Content-Type': 'text/plain' })
      if (err) {
        resp.end(`Auth error: ${err}`)
        server.close()
        rej(new Error(`OAuth error: ${err}`))
        return
      }
      if (c) {
        resp.end('Authentication successful. You can close this tab.')
        server.close()
        res(c)
      } else {
        resp.end('Waiting for OAuth code...')
      }
    })
    server.listen(OAUTH_LOOPBACK_PORT, '127.0.0.1', () => {
      log(`${C.cyan}OAuth consent required.${C.reset} Open this URL in your browser:`)
      log(`  ${authUrl}`)
      try { spawn('open', [authUrl], { stdio: 'ignore', detached: true }).unref() } catch {}
    })
    server.on('error', rej)
  })

  const { tokens } = await oauth.getToken(code)
  oauth.setCredentials(tokens)
  persistTokens(tokens)
}

async function getDrive() {
  if (_drive) return _drive
  const cfg = parseOAuthClient()
  const oauth = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, OAUTH_REDIRECT_URI)

  if (existsSync(OAUTH_TOKEN_PATH)) {
    oauth.setCredentials(JSON.parse(readFileSync(OAUTH_TOKEN_PATH, 'utf-8')))
  } else {
    await runConsentFlow(oauth)
  }
  // Persist refreshed access tokens (and any rotated refresh_token) on the fly.
  oauth.on('tokens', persistTokens)

  _drive = google.drive({ version: 'v3', auth: oauth })
  return _drive
}

function getFirestore() {
  if (_firestore) return _firestore
  const credentials = parseServiceAccount()
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  _firestore = admin.firestore()
  return _firestore
}

// ── Drive helpers ────────────────────────────────────────────────────────────

let _pdfFolderId = null

async function getOrCreateFolder(drive, name, parentId) {
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and ${parentClause} and trashed=false`
  const list = await drive.files.list({
    q,
    fields: 'files(id)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  if (list.data.files && list.data.files.length > 0) return list.data.files[0].id
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
    supportsAllDrives: true,
  })
  return created.data.id
}

async function getPdfFolderId() {
  if (_pdfFolderId) return _pdfFolderId
  if (FOLDER_ID_OVERRIDE) {
    _pdfFolderId = FOLDER_ID_OVERRIDE
    return _pdfFolderId
  }
  const drive = await getDrive()
  const rootId = await getOrCreateFolder(drive, DRIVE_ROOT_NAME, null)
  _pdfFolderId = await getOrCreateFolder(drive, DRIVE_PDFS_NAME, rootId)
  return _pdfFolderId
}

async function uploadPdf(filePath, displayName) {
  const drive = await getDrive()
  const folderId = await getPdfFolderId()

  const create = await withBackoff(() =>
    drive.files.create({
      requestBody: {
        name: `${displayName}.pdf`,
        mimeType: 'application/pdf',
        parents: [folderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: createReadStream(filePath),
      },
      fields: 'id',
      supportsAllDrives: true,
    }),
  )
  const fileId = create.data.id

  await withBackoff(() =>
    drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    }),
  )

  return fileId
}

// ── Backoff for 429 / 5xx ────────────────────────────────────────────────────

async function withBackoff(fn) {
  let delay = 2000
  // try ~5 attempts: 2s, 4s, 8s, 16s, 32s, 60s cap, then bail
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const code = err?.code || err?.response?.status
      const retriable = code === 429 || (code >= 500 && code < 600)
      if (!retriable || attempt === 5) throw err
      const wait = Math.min(delay, 60_000)
      logErr(`${C.yellow}  rate-limited (${code}), backing off ${wait}ms${C.reset}`)
      await new Promise((r) => setTimeout(r, wait))
      delay *= 2
    }
  }
}

// ── PDF introspection (mirrors src/lib/pdf-introspect.ts) ────────────────────

function prettifyFieldName(name) {
  const last = name.split('.').pop() ?? name
  return last
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

async function introspectPdf(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const form = pdfDoc.getForm()
  const rawFields = form.getFields()
  const fields = rawFields.filter(Boolean)

  const result = []
  let order = 0

  for (const field of fields) {
    const pdfFieldName = field.getName()
    let type = 'unsupported'
    let isMultiline = false
    let maxLength = null
    let options

    if (field instanceof PDFTextField) {
      type = 'text'
      isMultiline = field.isMultiline()
      maxLength = field.getMaxLength() ?? null
    } else if (field instanceof PDFCheckBox) {
      type = 'checkbox'
    } else if (field instanceof PDFDropdown) {
      type = 'dropdown'
      options = field.getOptions()
    } else if (field instanceof PDFOptionList) {
      type = 'dropdown'
      options = field.getOptions()
    } else if (field instanceof PDFRadioGroup) {
      type = 'radio'
      options = field.getOptions()
    }

    let isReadOnly = false
    try { isReadOnly = field.isReadOnly() } catch { isReadOnly = true }

    // Per spec: every field gets isRequired: false
    const isRequired = false

    const hidden = type === 'unsupported' || isReadOnly

    result.push({
      pdfFieldName,
      type,
      label: prettifyFieldName(pdfFieldName),
      hint: '',
      group: '',
      order: order++,
      isRequired,
      isMultiline: isMultiline || undefined,
      maxLength: maxLength ?? undefined,
      options,
      hidden,
    })
  }
  return result
}

// ── Bundle/file walking ──────────────────────────────────────────────────────

function listBundleDirs() {
  if (!existsSync(OUTPUT_ROOT)) {
    throw new Error(`Missing output root: ${OUTPUT_ROOT}`)
  }
  const all = readdirSync(OUTPUT_ROOT)
    .filter((n) => /^bundle-\d+$/.test(n))
    .sort((a, b) => parseInt(a.split('-')[1], 10) - parseInt(b.split('-')[1], 10))
  if (bundleOnly) {
    const want = `bundle-${bundleOnly.replace(/^bundle-/, '')}`
    return all.filter((n) => n === want)
  }
  return all
}

function listPairsInBundle(bundleDir) {
  const dir = join(OUTPUT_ROOT, bundleDir)
  const entries = readdirSync(dir)
  const stems = new Map() // stem → { pdf, json }
  for (const name of entries) {
    if (name.endsWith('.fields.json')) {
      const stem = name.slice(0, -'.fields.json'.length)
      const cur = stems.get(stem) || {}
      cur.json = join(dir, name)
      stems.set(stem, cur)
    } else if (name.endsWith('.pdf')) {
      const stem = name.slice(0, -'.pdf'.length)
      const cur = stems.get(stem) || {}
      cur.pdf = join(dir, name)
      stems.set(stem, cur)
    }
  }
  const out = []
  for (const [stem, pair] of stems) {
    if (pair.pdf && pair.json) out.push({ stem, pdfPath: pair.pdf, jsonPath: pair.json })
  }
  return out
}

// ── Institution → county map ─────────────────────────────────────────────────

function buildCountyMap() {
  const map = new Map()
  if (!existsSync(INDEX_PATH)) {
    logErr(`${C.yellow}index.json missing — county lookup disabled${C.reset}`)
    return map
  }
  const idx = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
  const entries = Array.isArray(idx) ? idx : (idx.entries || [])
  for (const e of entries) {
    if (e.institution && e.county && !map.has(e.institution)) {
      map.set(e.institution, e.county)
    }
  }
  return map
}

// ── Name derivation ──────────────────────────────────────────────────────────

function deriveTemplateName(stem) {
  // Strip trailing _NNNNN (eDirect id) and replace underscores with spaces.
  return stem
    .replace(/_\d+$/, '')
    .replace(/_/g, ' ')
    .trim()
}

function organizationFromSource(source) {
  // .../bundles/300/Primaria Comunei Bla/file.pdf → "Primaria Comunei Bla"
  if (!source) return undefined
  const parts = source.split('/')
  if (parts.length < 2) return undefined
  return parts[parts.length - 2]
}

// ── Progress ─────────────────────────────────────────────────────────────────

function loadProgress() {
  if (existsSync(PROGRESS_PATH)) {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
  }
  return { uploaded: {} }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf-8')
}

// ── Main per-pair pipeline ───────────────────────────────────────────────────

async function processPair({ bundleDir, stem, pdfPath, jsonPath, countyMap }) {
  const pdfBytes = readFileSync(pdfPath)
  const detector = JSON.parse(readFileSync(jsonPath, 'utf-8'))

  const detectorFields = Array.isArray(detector.fields) ? detector.fields : []
  const avgConfidence = typeof detector.avgConfidence === 'number' ? detector.avgConfidence : 0

  const fields = await introspectPdf(pdfBytes)

  const acroFieldCount = fields.length
  const detectorFieldCount = detectorFields.length

  let needsReview = false
  if (avgConfidence < 0.75) needsReview = true
  if (detectorFieldCount === 0) needsReview = true
  if (
    detectorFieldCount > 0 &&
    acroFieldCount < detectorFieldCount * 0.8
  ) {
    needsReview = true
  }

  const organization = organizationFromSource(detector.source)
  const county = organization ? countyMap.get(organization) : undefined

  const name = deriveTemplateName(stem)
  const id = randomUUID()

  const template = {
    id,
    name,
    organization,
    county,
    version: 1,
    createdAt: new Date().toISOString(),
    fields,
    archived: false,
    needsReview: needsReview || undefined,
    detectorConfidence: avgConfidence,
    driveFileId: '', // filled after upload
  }

  if (dryRun) {
    return { template, fileId: null, needsReview, acroFieldCount, detectorFieldCount }
  }

  const fileId = await uploadPdf(pdfPath, name)
  template.driveFileId = fileId

  const db = getFirestore()
  // Strip undefineds the same way the platform's saveTemplate does.
  const data = JSON.parse(JSON.stringify(template))
  await withBackoff(() => db.collection('templates').doc(id).set(data))

  return { template, fileId, needsReview, acroFieldCount, detectorFieldCount }
}

// ── Concurrency runner ───────────────────────────────────────────────────────

async function runQueue(items, worker, conc) {
  const results = []
  let cursor = 0
  let done = 0
  async function next() {
    while (cursor < items.length) {
      const i = cursor++
      try {
        const r = await worker(items[i], i, items.length)
        results.push(r)
      } catch (err) {
        results.push({ error: err, item: items[i] })
      }
      done++
    }
  }
  await Promise.all(Array.from({ length: conc }, next))
  return results
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`${C.bold}upload-templates.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}${C.reset}`)
  const countyMap = buildCountyMap()
  log(`${C.dim}county map: ${countyMap.size} institutions${C.reset}`)

  const progress = loadProgress()
  const alreadyDone = new Set(Object.keys(progress.uploaded))
  log(`${C.dim}progress: ${alreadyDone.size} already uploaded${C.reset}`)

  const bundles = listBundleDirs()
  log(`${C.dim}bundles: ${bundles.join(', ') || '(none)'}${C.reset}`)

  const queue = []
  for (const bundleDir of bundles) {
    const pairs = listPairsInBundle(bundleDir)
    for (const p of pairs) {
      const key = `${bundleDir}/${p.stem}`
      if (alreadyDone.has(key)) continue
      queue.push({ ...p, bundleDir, key })
      if (queue.length >= limit) break
    }
    if (queue.length >= limit) break
  }
  log(`${C.bold}${queue.length}${C.reset} pair(s) to process` +
    (limit !== Infinity ? ` (limited to ${limit})` : ''))
  log()

  const total = queue.length
  let counter = 0
  let okCount = 0
  let reviewCount = 0
  let errCount = 0

  await runQueue(
    queue,
    async (item) => {
      counter++
      const i = counter
      try {
        const res = await processPair({ ...item, countyMap })
        okCount++
        if (res.needsReview) reviewCount++

        if (dryRun) {
          log(
            `[${i}/${total}] [${item.bundleDir}] ${C.cyan}DRY${C.reset}: ${item.stem}` +
            `  ${C.dim}→ fields=${res.acroFieldCount}/${res.detectorFieldCount},` +
            ` org="${res.template.organization ?? '?'}", county="${res.template.county ?? '?'}",` +
            ` conf=${res.template.detectorConfidence?.toFixed(2)},` +
            ` needsReview=${!!res.needsReview}${C.reset}`
          )
          if (i <= 3) {
            log(`${C.dim}     sample template: ${JSON.stringify({
              id: res.template.id,
              name: res.template.name,
              organization: res.template.organization,
              county: res.template.county,
              version: res.template.version,
              fields: res.template.fields.slice(0, 3).map((f) => ({
                pdfFieldName: f.pdfFieldName,
                type: f.type,
                label: f.label,
                isRequired: f.isRequired,
                isMultiline: f.isMultiline,
                maxLength: f.maxLength,
              })),
              fieldsTotal: res.template.fields.length,
              detectorConfidence: res.template.detectorConfidence,
              needsReview: res.template.needsReview,
              archived: res.template.archived,
            }, null, 2)}${C.reset}`)
          }
        } else {
          progress.uploaded[item.key] = {
            templateId: res.template.id,
            driveFileId: res.fileId,
            uploadedAt: new Date().toISOString(),
          }
          saveProgress(progress)
          log(
            `[${i}/${total}] [${item.bundleDir}] ${C.green}OK${C.reset}: ${item.stem}` +
            `  →  ${C.blue}${res.fileId}${C.reset}, fields=${res.template.fields.length},` +
            ` needsReview=${!!res.needsReview}`
          )
        }
      } catch (err) {
        errCount++
        logErr(
          `[${i}/${total}] [${item.bundleDir}] ${C.red}FAIL${C.reset}: ${item.stem}` +
          ` — ${err?.message || err}`
        )
      }
    },
    concurrency,
  )

  log()
  log(`${C.bold}done.${C.reset} ok=${okCount} review=${reviewCount} fail=${errCount}` +
    (dryRun ? `  ${C.dim}(dry-run, nothing written)${C.reset}` : ''))
}

main().catch((err) => {
  logErr(`${C.red}fatal:${C.reset} ${err?.stack || err}`)
  process.exit(1)
})
