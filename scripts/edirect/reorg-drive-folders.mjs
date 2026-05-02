#!/usr/bin/env node
/**
 * reorg-drive-folders.mjs — moves uploaded PDFs into per-institution subfolders.
 *
 * After upload-templates.mjs runs, every PDF lives flat in
 * `Tipizatul.eu/PDFs/`. This script reads each Template doc from Firestore,
 * computes the target folder `Tipizatul.eu/PDFs/<organization>/`, and moves
 * the Drive file there with a metadata-only update (parents change, file id
 * stays — so Firestore `driveFileId` references are unaffected).
 *
 * Idempotent: a file already in the target folder is skipped. Safe to re-run.
 *
 * Env vars: same as upload-templates.mjs (GOOGLE_OAUTH_CLIENT_KEY for Drive,
 * GOOGLE_SERVICE_ACCOUNT_KEY for Firestore). Reuses the cached
 * `.oauth-token.json` so no second consent flow.
 *
 * Usage
 * -----
 *   node scripts/edirect/reorg-drive-folders.mjs                 # everything
 *   node scripts/edirect/reorg-drive-folders.mjs --dry-run       # report only
 *   node scripts/edirect/reorg-drive-folders.mjs --limit 100
 *   node scripts/edirect/reorg-drive-folders.mjs --concurrency 4
 *   node scripts/edirect/reorg-drive-folders.mjs --filter "Cluj" # orgs containing "Cluj"
 *
 * Resume
 * ------
 *   Progress is persisted to `reorg-drive-folders-progress.json`. Re-running
 *   the script skips already-moved files. Delete the file to force a re-pass.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

import { google } from 'googleapis'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROGRESS_PATH = resolve(__dirname, 'reorg-drive-folders-progress.json')
const OAUTH_TOKEN_PATH = resolve(__dirname, '.oauth-token.json')
const OAUTH_LOOPBACK_PORT = parseInt(process.env.OAUTH_LOOPBACK_PORT || '53682', 10)
const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}`

const DRIVE_ROOT_NAME = 'Tipizatul.eu'
const DRIVE_PDFS_NAME = 'PDFs'
// Subfolder name used inside each org folder for the truly-untouched bundle PDFs.
const ORIGINAL_SUBFOLDER_NAME = 'Original'
const FOLDER_ID_OVERRIDE = process.env.FOLDER_ID_OVERRIDE || null
const NO_ORG_BUCKET = 'Altele'

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const limit = parseInt(getArg('limit') ?? '0', 10) || Infinity
const concurrency = Math.max(1, parseInt(getArg('concurrency') ?? '4', 10))
const filter = getArg('filter') || ''

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

// ── Backoff ──────────────────────────────────────────────────────────────────

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

// ── Folder helpers ───────────────────────────────────────────────────────────

const _folderCache = new Map() // `${parentId}::${name}` → id

async function getOrCreateFolder(drive, name, parentId) {
  const key = `${parentId || 'root'}::${name}`
  if (_folderCache.has(key)) return _folderCache.get(key)
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`
  const safeName = name.replace(/'/g, "\\'")
  const q = `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and ${parentClause} and trashed=false`
  const list = await withBackoff(() =>
    drive.files.list({
      q,
      fields: 'files(id)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    }),
  )
  if (list.data.files && list.data.files.length > 0) {
    _folderCache.set(key, list.data.files[0].id)
    return list.data.files[0].id
  }
  const created = await withBackoff(() =>
    drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id',
      supportsAllDrives: true,
    }),
  )
  _folderCache.set(key, created.data.id)
  return created.data.id
}

let _pdfFolderId = null
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

// Sanitize an organization name for use as a Drive folder name. Drive accepts
// almost everything, but slashes and control chars cause UI weirdness.
function sanitizeFolderName(name) {
  return name
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/]/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

// ── Progress ─────────────────────────────────────────────────────────────────

function loadProgress() {
  if (existsSync(PROGRESS_PATH)) {
    const raw = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
    return { moved: raw.moved || {}, movedOriginals: raw.movedOriginals || {} }
  }
  return { moved: {}, movedOriginals: {} }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf-8')
}

// ── Per-template move ───────────────────────────────────────────────────────

async function reorgOne({ templateId, fileId, orgFolderName, pdfsFolderId, subfolderName }) {
  const drive = await getDrive()
  const orgFolderId = await getOrCreateFolder(drive, orgFolderName, pdfsFolderId)
  const targetFolderId = subfolderName
    ? await getOrCreateFolder(drive, subfolderName, orgFolderId)
    : orgFolderId

  // Look up current parents — skip if already in target folder.
  const meta = await withBackoff(() =>
    drive.files.get({
      fileId,
      fields: 'id, parents',
      supportsAllDrives: true,
    }),
  )
  const parents = meta.data.parents || []
  if (parents.length === 1 && parents[0] === targetFolderId) {
    return { templateId, fileId, targetFolderId, action: 'already-in-place' }
  }

  if (dryRun) {
    return { templateId, fileId, targetFolderId, action: 'would-move', from: parents }
  }

  const removeParents = parents.join(',')
  await withBackoff(() =>
    drive.files.update({
      fileId,
      addParents: targetFolderId,
      removeParents,
      fields: 'id, parents',
      supportsAllDrives: true,
    }),
  )
  return { templateId, fileId, targetFolderId, action: 'moved' }
}

// ── Concurrency runner ──────────────────────────────────────────────────────

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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log(`${C.bold}reorg-drive-folders.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}${C.reset}`)

  const db = getFirestore()
  const snap = await db.collection('templates').get()
  log(`${C.dim}firestore: ${snap.size} template docs${C.reset}`)

  const progress = loadProgress()
  const alreadyDone = new Set(Object.keys(progress.moved))
  log(`${C.dim}progress: ${alreadyDone.size} already moved${C.reset}`)

  const pdfsFolderId = await getPdfFolderId()
  log(`${C.dim}root PDFs folder: ${pdfsFolderId}${C.reset}`)

  const queue = []
  for (const doc of snap.docs) {
    const t = doc.data()
    if (!t?.driveFileId) continue
    if (alreadyDone.has(t.id)) continue
    const org = (t.organization && String(t.organization).trim()) || NO_ORG_BUCKET
    if (filter && !org.toLowerCase().includes(filter.toLowerCase())) continue
    const orgFolderName = sanitizeFolderName(org)
    queue.push({ templateId: t.id, fileId: t.driveFileId, orgFolderName })
    if (queue.length >= limit) break
  }
  log(`${C.bold}${queue.length}${C.reset} file(s) to reorg` + (limit !== Infinity ? ` (limited to ${limit})` : ''))
  log()

  const total = queue.length
  let counter = 0
  let movedCount = 0
  let skipCount = 0
  let errCount = 0

  await runQueue(
    queue,
    async (item) => {
      counter++
      const i = counter
      try {
        const res = await reorgOne({ ...item, pdfsFolderId })
        if (res.action === 'already-in-place') {
          skipCount++
          if (i % 250 === 0 || i === 1) {
            log(`[${i}/${total}] ${C.dim}SKIP${C.reset} (already in ${item.orgFolderName})`)
          }
        } else if (res.action === 'would-move') {
          movedCount++
          log(`[${i}/${total}] ${C.cyan}DRY${C.reset} → ${item.orgFolderName}`)
        } else {
          movedCount++
          progress.moved[item.templateId] = {
            fileId: item.fileId,
            targetFolderId: res.targetFolderId,
            movedAt: new Date().toISOString(),
          }
          if (i % 50 === 0 || i === 1) saveProgress(progress)
          if (i % 100 === 0 || i === 1) {
            log(`[${i}/${total}] ${C.green}MOVED${C.reset} → ${item.orgFolderName}`)
          }
        }
      } catch (err) {
        errCount++
        logErr(`[${i}/${total}] ${C.red}FAIL${C.reset} ${item.templateId} (${item.fileId}) — ${err?.message || err}`)
      }
    },
    concurrency,
  )

  if (!dryRun) saveProgress(progress)

  log()
  log(`${C.bold}AcroForm pass:${C.reset} moved=${movedCount} skipped=${skipCount} fail=${errCount}` +
    (dryRun ? `  ${C.dim}(dry-run, nothing changed)${C.reset}` : ''))

  // ── Second pass: move originals into {org}/Original/ ──────────────────────
  const alreadyDoneOrig = new Set(Object.keys(progress.movedOriginals))

  const origQueue = []
  for (const doc of snap.docs) {
    const t = doc.data()
    if (!t?.originalDriveFileId) continue
    if (alreadyDoneOrig.has(t.id)) continue
    const org = (t.organization && String(t.organization).trim()) || NO_ORG_BUCKET
    if (filter && !org.toLowerCase().includes(filter.toLowerCase())) continue
    const orgFolderName = sanitizeFolderName(org)
    origQueue.push({ templateId: t.id, fileId: t.originalDriveFileId, orgFolderName })
    if (origQueue.length >= limit) break
  }
  log()
  log(`${C.bold}${origQueue.length}${C.reset} original(s) to reorg` + (limit !== Infinity ? ` (limited to ${limit})` : ''))

  let origMoved = 0
  let origSkip = 0
  let origErr = 0
  let origCounter = 0
  const origTotal = origQueue.length

  await runQueue(
    origQueue,
    async (item) => {
      origCounter++
      const i = origCounter
      try {
        const res = await reorgOne({ ...item, pdfsFolderId, subfolderName: ORIGINAL_SUBFOLDER_NAME })
        if (res.action === 'already-in-place') {
          origSkip++
          if (i % 250 === 0 || i === 1) {
            log(`[${i}/${origTotal}] ${C.dim}SKIP${C.reset} (already in ${item.orgFolderName}/${ORIGINAL_SUBFOLDER_NAME})`)
          }
        } else if (res.action === 'would-move') {
          origMoved++
          log(`[${i}/${origTotal}] ${C.cyan}DRY${C.reset} → ${item.orgFolderName}/${ORIGINAL_SUBFOLDER_NAME}`)
        } else {
          origMoved++
          progress.movedOriginals[item.templateId] = {
            fileId: item.fileId,
            targetFolderId: res.targetFolderId,
            movedAt: new Date().toISOString(),
          }
          if (i % 50 === 0 || i === 1) saveProgress(progress)
          if (i % 100 === 0 || i === 1) {
            log(`[${i}/${origTotal}] ${C.green}MOVED${C.reset} → ${item.orgFolderName}/${ORIGINAL_SUBFOLDER_NAME}`)
          }
        }
      } catch (err) {
        origErr++
        logErr(`[${i}/${origTotal}] ${C.red}FAIL${C.reset} orig ${item.templateId} (${item.fileId}) — ${err?.message || err}`)
      }
    },
    concurrency,
  )

  if (!dryRun) saveProgress(progress)

  log()
  log(`${C.bold}Originals pass:${C.reset} moved=${origMoved} skipped=${origSkip} fail=${origErr}` +
    (dryRun ? `  ${C.dim}(dry-run, nothing changed)${C.reset}` : ''))
}

main().catch((err) => {
  logErr(`${C.red}fatal:${C.reset} ${err?.stack || err}`)
  process.exit(1)
})
