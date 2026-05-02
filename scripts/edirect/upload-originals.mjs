#!/usr/bin/env node
/**
 * upload-originals.mjs — backfill the truly-untouched bundle PDF for every
 * template that already has `driveFileId` (the AcroForm-injected copy) but
 * no `originalDriveFileId`.
 *
 * For each pending template:
 *   1. Look up `${bundleDir}/${stem}` in upload-templates-progress.json to
 *      find the on-disk paddle/output/bundle-N/<stem>.fields.json.
 *   2. Read its `source` → that's the path to the truly-original bundle PDF.
 *   3. Upload to `Tipizatul.eu/PDFs/Originals/` (flat staging — run
 *      reorg-drive-folders.mjs afterwards to move into {Org}/Original/).
 *   4. Patch the Firestore template doc with `originalDriveFileId`.
 *
 * Progress is persisted to `upload-originals-progress.json` and the script
 * resumes safely on re-run.
 *
 * Prerequisites mirror upload-templates.mjs (GOOGLE_SERVICE_ACCOUNT_KEY +
 * GOOGLE_OAUTH_CLIENT_KEY env vars, OAuth token cached at .oauth-token.json).
 *
 * Usage
 * -----
 *   node scripts/edirect/upload-originals.mjs                 # everything
 *   node scripts/edirect/upload-originals.mjs --dry-run       # plan only
 *   node scripts/edirect/upload-originals.mjs --limit 50      # cap N
 *   node scripts/edirect/upload-originals.mjs --concurrency 4
 */

import { readFileSync, writeFileSync, existsSync, createReadStream } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

import { google } from 'googleapis'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_PROGRESS_PATH = resolve(__dirname, 'upload-templates-progress.json')
const PROGRESS_PATH = resolve(__dirname, 'upload-originals-progress.json')
const OAUTH_TOKEN_PATH = resolve(__dirname, '.oauth-token.json')
const OAUTH_LOOPBACK_PORT = parseInt(process.env.OAUTH_LOOPBACK_PORT || '53682', 10)
const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}`

const DRIVE_ROOT_NAME = 'Tipizatul.eu'
const DRIVE_PDFS_NAME = 'PDFs'
const DRIVE_ORIGINALS_NAME = 'Originals'
const FOLDER_ID_OVERRIDE = process.env.FOLDER_ID_OVERRIDE || null

const PADDLE_OUTPUT = resolve(__dirname, 'paddle/output')

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const limit = parseInt(getArg('limit') ?? '0', 10) || Infinity
const concurrency = Math.max(1, parseInt(getArg('concurrency') ?? '2', 10))

// ── Pretty logging ───────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
}
function log(s = '') { process.stdout.write(s + '\n') }
function logErr(s) { process.stderr.write(s + '\n') }

// ── Auth (mirrors upload-templates.mjs) ──────────────────────────────────────

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

function parseOAuthClient() {
  const raw = process.env.GOOGLE_OAUTH_CLIENT_KEY
  if (!raw) {
    if (dryRun) return null
    throw new Error('GOOGLE_OAUTH_CLIENT_KEY env var not set')
  }
  let json
  if (raw.trim().startsWith('{')) {
    json = JSON.parse(raw)
  } else if (existsSync(raw)) {
    json = JSON.parse(readFileSync(raw, 'utf-8'))
  } else {
    json = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  }
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

let _drive = null
let _firestore = null

async function getDrive() {
  if (_drive) return _drive
  const cfg = parseOAuthClient()
  const oauth = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, OAUTH_REDIRECT_URI)

  if (existsSync(OAUTH_TOKEN_PATH)) {
    oauth.setCredentials(JSON.parse(readFileSync(OAUTH_TOKEN_PATH, 'utf-8')))
  } else {
    await runConsentFlow(oauth)
  }
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

let _originalsFolderId = null
async function getOriginalsFolderId() {
  if (_originalsFolderId) return _originalsFolderId
  const drive = await getDrive()
  let pdfsId = FOLDER_ID_OVERRIDE
  if (!pdfsId) {
    const rootId = await getOrCreateFolder(drive, DRIVE_ROOT_NAME, null)
    pdfsId = await getOrCreateFolder(drive, DRIVE_PDFS_NAME, rootId)
  }
  _originalsFolderId = await getOrCreateFolder(drive, DRIVE_ORIGINALS_NAME, pdfsId)
  return _originalsFolderId
}

async function withBackoff(fn) {
  let delay = 2000
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

async function uploadOriginalPdf(filePath, displayName) {
  const drive = await getDrive()
  const folderId = await getOriginalsFolderId()
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

// ── Build templateId → bundle source path map ────────────────────────────────

function buildSourceIndex() {
  // upload-templates-progress.json maps "{bundleDir}/{stem}" → { templateId, ... }.
  // We invert it and dereference each <stem>.fields.json to recover the source path.
  if (!existsSync(UPLOAD_PROGRESS_PATH)) {
    throw new Error(`Missing ${UPLOAD_PROGRESS_PATH} — cannot resolve original PDFs without it`)
  }
  const up = JSON.parse(readFileSync(UPLOAD_PROGRESS_PATH, 'utf-8'))
  const uploaded = up.uploaded || {}

  const byTemplateId = new Map()
  let missingFieldsJson = 0
  let missingSource = 0

  for (const [key, entry] of Object.entries(uploaded)) {
    if (!entry?.templateId) continue
    const slash = key.indexOf('/')
    if (slash < 0) continue
    const bundleDir = key.slice(0, slash)
    const stem = key.slice(slash + 1)
    const fieldsJsonPath = resolve(PADDLE_OUTPUT, bundleDir, `${stem}.fields.json`)
    if (!existsSync(fieldsJsonPath)) {
      missingFieldsJson++
      continue
    }
    let detector
    try {
      detector = JSON.parse(readFileSync(fieldsJsonPath, 'utf-8'))
    } catch {
      missingFieldsJson++
      continue
    }
    const source = typeof detector?.source === 'string' ? detector.source : null
    if (!source) {
      missingSource++
      continue
    }
    byTemplateId.set(entry.templateId, { stem, sourcePath: source })
  }

  return { byTemplateId, missingFieldsJson, missingSource }
}

// ── Concurrency runner ───────────────────────────────────────────────────────

async function runQueue(items, worker, conc) {
  const results = []
  let cursor = 0
  async function next() {
    while (cursor < items.length) {
      const i = cursor++
      try {
        results.push(await worker(items[i], i, items.length))
      } catch (err) {
        results.push({ error: err, item: items[i] })
      }
    }
  }
  await Promise.all(Array.from({ length: conc }, next))
  return results
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`${C.bold}upload-originals.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}${C.reset}`)

  const { byTemplateId, missingFieldsJson, missingSource } = buildSourceIndex()
  log(`${C.dim}upload-templates progress index: ${byTemplateId.size} entries with resolvable source` +
    (missingFieldsJson ? `, ${missingFieldsJson} missing .fields.json` : '') +
    (missingSource ? `, ${missingSource} missing detector.source` : '') +
    `${C.reset}`)

  const db = getFirestore()
  const snap = await db.collection('templates').get()
  log(`${C.dim}firestore: ${snap.size} template docs${C.reset}`)

  const progress = loadProgress()
  const alreadyDone = new Set(Object.keys(progress.uploaded))
  log(`${C.dim}progress: ${alreadyDone.size} already done${C.reset}`)

  const queue = []
  let skippedHasOriginal = 0
  let skippedNoSource = 0
  let skippedSourceMissing = 0

  for (const doc of snap.docs) {
    const t = doc.data()
    if (!t?.id || !t?.driveFileId) continue
    if (t.originalDriveFileId) { skippedHasOriginal++; continue }
    if (alreadyDone.has(t.id)) continue

    const indexed = byTemplateId.get(t.id)
    if (!indexed) { skippedNoSource++; continue }
    if (!existsSync(indexed.sourcePath)) { skippedSourceMissing++; continue }

    queue.push({ templateId: t.id, name: t.name, sourcePath: indexed.sourcePath, stem: indexed.stem })
    if (queue.length >= limit) break
  }

  log(`${C.dim}skip: ${skippedHasOriginal} already have originalDriveFileId, ` +
    `${skippedNoSource} no progress entry, ${skippedSourceMissing} source missing on disk${C.reset}`)
  log(`${C.bold}${queue.length}${C.reset} template(s) to upload originals for` +
    (limit !== Infinity ? ` (limited to ${limit})` : ''))
  log()

  let okCount = 0
  let errCount = 0
  let counter = 0
  const total = queue.length

  await runQueue(
    queue,
    async (item) => {
      counter++
      const i = counter
      try {
        if (dryRun) {
          log(`[${i}/${total}] ${C.cyan}DRY${C.reset}: ${item.stem}` +
            `  ${C.dim}← ${item.sourcePath}${C.reset}`)
          return
        }
        const originalFileId = await uploadOriginalPdf(item.sourcePath, item.name)
        await withBackoff(() =>
          db.collection('templates').doc(item.templateId).update({ originalDriveFileId: originalFileId }),
        )
        progress.uploaded[item.templateId] = {
          originalDriveFileId: originalFileId,
          uploadedAt: new Date().toISOString(),
        }
        if (i % 25 === 0 || i === 1) saveProgress(progress)
        okCount++
        log(`[${i}/${total}] ${C.green}OK${C.reset}: ${item.stem}  →  ${C.blue}${originalFileId}${C.reset}`)
      } catch (err) {
        errCount++
        logErr(`[${i}/${total}] ${C.red}FAIL${C.reset}: ${item.templateId} (${item.stem}) — ${err?.message || err}`)
      }
    },
    concurrency,
  )

  if (!dryRun) saveProgress(progress)

  log()
  log(`${C.bold}done.${C.reset} ok=${okCount} fail=${errCount}` +
    (dryRun ? `  ${C.dim}(dry-run, nothing changed)${C.reset}` : ''))
  log(`${C.dim}Next: run reorg-drive-folders.mjs to move originals into {Org}/Original/.${C.reset}`)
}

main().catch((err) => {
  logErr(`${C.red}fatal:${C.reset} ${err?.stack || err}`)
  process.exit(1)
})
