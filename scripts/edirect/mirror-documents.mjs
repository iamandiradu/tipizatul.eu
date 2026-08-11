#!/usr/bin/env node
/**
 * mirror-documents.mjs — mirror every eDirect source document onto our own
 * Drive so procedure pages stop hotlinking edirect.e-guvernare.ro.
 *
 * Today `ProcedureDocument.downloadUrl` points straight at eDirect. That works
 * (the files are public, no session needed) right up until eDirect is down,
 * renames a file, or drops it — at which point the download button 404s and we
 * have no copy. download.mjs already pulled 8.4k of those files to
 * `downloads/`; this script pushes them to Drive and records the file id so
 * build-procedures.mjs can bake it into public/procedures.json.
 *
 * Files are mirrored **byte-for-byte**, keeping their original extension and
 * MIME type. No .doc → .pdf conversion happens here: the .doc an institution
 * publishes is the artifact the citizen is expected to submit, and a
 * LibreOffice re-render is not guaranteed to match it. Rendition passes belong
 * in convert-docs.mjs, layered on top of an intact mirror.
 *
 * Scope defaults to documents actually reachable from public/procedures.json.
 * `--all` widens it to every downloaded index.json entry.
 *
 * Progress is persisted to `mirror-progress.json` keyed by eDirect doc id, so
 * re-runs resume and never re-upload.
 *
 * Prerequisites mirror upload-originals.mjs: GOOGLE_OAUTH_CLIENT_KEY (Drive
 * writes run as you — service accounts have no storage quota of their own),
 * with the token cached at .oauth-token.json.
 *
 * Usage
 * -----
 *   node scripts/edirect/mirror-documents.mjs --dry-run      # plan only
 *   node scripts/edirect/mirror-documents.mjs --limit 25     # cap N
 *   node scripts/edirect/mirror-documents.mjs --concurrency 4
 *   node scripts/edirect/mirror-documents.mjs --ext pdf      # PDFs first
 *   node scripts/edirect/mirror-documents.mjs --all          # whole index
 */

import { readFileSync, writeFileSync, existsSync, createReadStream, statSync } from 'node:fs'
import { resolve, dirname, join, extname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

import { google } from 'googleapis'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_PATH = resolve(__dirname, 'index.json')
const DOWNLOAD_PROGRESS_PATH = resolve(__dirname, 'download-progress.json')
const DOWNLOADS_DIR = resolve(__dirname, 'downloads')
const PROCEDURES_BUNDLE_PATH = resolve(__dirname, '..', '..', 'public', 'procedures.json')
const PROGRESS_PATH = resolve(__dirname, 'mirror-progress.json')
const OAUTH_TOKEN_PATH = resolve(__dirname, '.oauth-token.json')
const OAUTH_LOOPBACK_PORT = parseInt(process.env.OAUTH_LOOPBACK_PORT || '53682', 10)
const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}`

const DRIVE_ROOT_NAME = 'Tipizatul.eu'
const DRIVE_PDFS_NAME = 'PDFs'
const DRIVE_MIRROR_NAME = 'Mirror'
const FOLDER_ID_OVERRIDE = process.env.FOLDER_ID_OVERRIDE || null

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const mirrorAll = args.includes('--all')
const limit = parseInt(getArg('limit') ?? '0', 10) || Infinity
const concurrency = Math.max(1, parseInt(getArg('concurrency') ?? '3', 10))
const extFilter = getArg('ext')?.split(',').map((e) => e.trim().toLowerCase()) ?? null

// ── Pretty logging ───────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
}
function log(s = '') { process.stdout.write(s + '\n') }
function logErr(s) { process.stderr.write(s + '\n') }

function humanBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// ── Extension → MIME ─────────────────────────────────────────────────────────

// index.json carries a few duplicate-upload artifacts ("doc(2)", "pdf(3)") —
// eDirect appends a counter when an institution uploads the same filename
// twice. Strip it so the real extension survives into Drive.
function normalizeExt(raw) {
  if (!raw) return ''
  return String(raw).toLowerCase().replace(/\(\d+\)$/, '').replace(/^\./, '').trim()
}

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  zip: 'application/zip',
}

function mimeForExt(ext) {
  return MIME_BY_EXT[ext] || 'application/octet-stream'
}

// ── Auth (mirrors upload-originals.mjs) ──────────────────────────────────────

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
      // Best-effort auto-open. `open` is macOS-only, so pick per platform —
      // and never let a missing launcher break the flow: the URL is printed
      // above and pasting it by hand works identically.
      try {
        const [cmd, cmdArgs] =
          process.platform === 'win32'
            ? ['cmd', ['/c', 'start', '', authUrl]]
            : process.platform === 'darwin'
              ? ['open', [authUrl]]
              : ['xdg-open', [authUrl]]
        spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).unref()
      } catch {
        /* paste the URL manually */
      }
    })
    server.on('error', rej)
  })

  const { tokens } = await oauth.getToken(code)
  oauth.setCredentials(tokens)
  persistTokens(tokens)
}

// Memoizes the in-flight promise, not the resolved client. Caching the result
// alone is not enough under concurrency: N workers all observe `null` before
// the first consent completes, and each spins up its own loopback server on
// the same port — every one after the first dies with EADDRINUSE.
let _drivePromise = null

function getDrive() {
  if (_drivePromise) return _drivePromise
  _drivePromise = (async () => {
    const cfg = parseOAuthClient()
    const oauth = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, OAUTH_REDIRECT_URI)

    if (existsSync(OAUTH_TOKEN_PATH)) {
      oauth.setCredentials(JSON.parse(readFileSync(OAUTH_TOKEN_PATH, 'utf-8')))
    } else {
      await runConsentFlow(oauth)
    }
    oauth.on('tokens', persistTokens)

    return google.drive({ version: 'v3', auth: oauth })
  })().catch((err) => {
    // Don't poison the cache — a failed consent should be retryable.
    _drivePromise = null
    throw err
  })
  return _drivePromise
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

// Promise-memoized for the same reason as getDrive: getOrCreateFolder is
// look-then-create, so concurrent callers would each see "no Mirror folder"
// and create their own, scattering the mirror across duplicate folders.
let _mirrorFolderPromise = null
function getMirrorFolderId() {
  if (_mirrorFolderPromise) return _mirrorFolderPromise
  _mirrorFolderPromise = (async () => {
    const drive = await getDrive()
    let pdfsId = FOLDER_ID_OVERRIDE
    if (!pdfsId) {
      const rootId = await getOrCreateFolder(drive, DRIVE_ROOT_NAME, null)
      pdfsId = await getOrCreateFolder(drive, DRIVE_PDFS_NAME, rootId)
    }
    return getOrCreateFolder(drive, DRIVE_MIRROR_NAME, pdfsId)
  })().catch((err) => {
    _mirrorFolderPromise = null
    throw err
  })
  return _mirrorFolderPromise
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

// Drive filenames keep the eDirect doc id so a file found in the folder can
// always be traced back to its index.json entry without consulting progress.
function driveNameFor(item) {
  const base = (item.documentName || item.docId)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return `${base}_${item.docId}.${item.ext}`
}

async function uploadMirror(item) {
  const drive = await getDrive()
  const folderId = await getMirrorFolderId()
  const create = await withBackoff(() =>
    drive.files.create({
      requestBody: {
        name: driveNameFor(item),
        mimeType: item.mimeType,
        parents: [folderId],
        // Round-trips the provenance so a stray file in the folder is
        // self-describing even if mirror-progress.json is lost. Only the doc
        // id is stored: Drive caps each appProperties key+value pair at 124
        // bytes in UTF-8, which a source URL blows past — and the id resolves
        // back to that URL through index.json anyway.
        appProperties: {
          eDirectDocId: String(item.docId),
        },
      },
      media: {
        mimeType: item.mimeType,
        body: createReadStream(item.localPath),
      },
      fields: 'id,size',
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
  return { mirrored: {} }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf-8')
}

// ── Queue construction ───────────────────────────────────────────────────────

// The doc ids the public bundle can actually surface a download button for.
// Without --all this is the whole point of the run: mirroring index entries no
// procedure page links to just burns Drive quota.
function reachableDocIds() {
  if (!existsSync(PROCEDURES_BUNDLE_PATH)) {
    throw new Error(
      `Missing ${PROCEDURES_BUNDLE_PATH} — run build-procedures.mjs first, or pass --all`,
    )
  }
  const bundle = JSON.parse(readFileSync(PROCEDURES_BUNDLE_PATH, 'utf-8'))
  const ids = new Set()
  for (const p of Object.values(bundle.procedures || {})) {
    for (const d of p.documents || []) {
      if (d.eDirectDocId && d.downloadUrl) ids.add(String(d.eDirectDocId))
    }
  }
  return ids
}

function buildQueue(progress) {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')).entries || []
  const downloaded = JSON.parse(readFileSync(DOWNLOAD_PROGRESS_PATH, 'utf-8')).downloaded || {}
  const wanted = mirrorAll ? null : reachableDocIds()

  const stats = {
    indexEntries: index.length,
    wanted: wanted ? wanted.size : index.length,
    alreadyMirrored: 0,
    notReachable: 0,
    notDownloaded: 0,
    missingOnDisk: 0,
    extSkipped: 0,
    duplicateRows: 0,
  }

  const queue = []
  const queued = new Set()
  let bytes = 0

  for (const e of index) {
    const docId = String(e.id)
    if (wanted && !wanted.has(docId)) { stats.notReachable++; continue }
    if (progress.mirrored[docId]) { stats.alreadyMirrored++; continue }
    // index.json repeats 43 ids as byte-identical rows. The progress check
    // above can't catch them — nothing is recorded until the upload finishes —
    // so without this the same file uploads twice and the second write orphans
    // the first copy in Drive.
    if (queued.has(docId)) { stats.duplicateRows++; continue }
    queued.add(docId)

    const ext = normalizeExt(e.fileExtension)
    if (extFilter && !extFilter.includes(ext)) { stats.extSkipped++; continue }

    const rec = downloaded[docId]
    if (!rec?.path) { stats.notDownloaded++; continue }

    const localPath = join(DOWNLOADS_DIR, rec.path)
    if (!existsSync(localPath)) { stats.missingOnDisk++; continue }

    // Trust the bytes on disk over index.json's extension claim where they
    // disagree — download.mjs named the file from the same field, but a later
    // re-fetch could have corrected it.
    const diskExt = normalizeExt(extname(localPath))
    const finalExt = diskExt || ext || 'bin'
    const size = statSync(localPath).size
    bytes += size

    queue.push({
      docId,
      documentName: e.documentName || '',
      institution: e.institution || '',
      sourceUrl: e.downloadUrl || '',
      ext: finalExt,
      mimeType: mimeForExt(finalExt),
      localPath,
      size,
    })
    if (queue.length >= limit) break
  }

  return { queue, stats, bytes }
}

// ── Concurrency runner ───────────────────────────────────────────────────────

async function runQueue(items, worker, conc) {
  let cursor = 0
  async function next() {
    while (cursor < items.length) {
      const i = cursor++
      await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: conc }, next))
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`${C.bold}mirror-documents.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}` +
    `${mirrorAll ? ', scope=all index entries' : ', scope=procedures.json reachable'}${C.reset}`)

  const progress = loadProgress()
  const { queue, stats, bytes } = buildQueue(progress)

  log(`${C.dim}index: ${stats.indexEntries} entries · in scope: ${stats.wanted}` +
    ` · already mirrored: ${stats.alreadyMirrored}${C.reset}`)
  log(`${C.dim}skip: ${stats.notReachable} not linked from any procedure page, ` +
    `${stats.notDownloaded} never downloaded, ${stats.missingOnDisk} missing on disk` +
    (stats.duplicateRows ? `, ${stats.duplicateRows} duplicate index rows` : '') +
    (extFilter ? `, ${stats.extSkipped} filtered by --ext` : '') + `${C.reset}`)

  const byExt = {}
  for (const q of queue) byExt[q.ext] = (byExt[q.ext] || 0) + 1
  log(`${C.bold}${queue.length}${C.reset} file(s) to mirror, ${humanBytes(bytes)} total` +
    (limit !== Infinity ? ` ${C.dim}(limited to ${limit})${C.reset}` : ''))
  if (queue.length) {
    log(`${C.dim}by type: ${Object.entries(byExt).sort((a, b) => b[1] - a[1])
      .map(([e, n]) => `${e}=${n}`).join(' ')}${C.reset}`)
  }
  log()

  if (!queue.length) {
    log(`${C.green}nothing to do.${C.reset}`)
    return
  }

  // Resolve auth and the destination folder before any worker starts, so the
  // consent prompt (and any failure to authenticate) surfaces once, up front,
  // instead of racing N workers on first upload.
  if (!dryRun) {
    const folderId = await getMirrorFolderId()
    log(`${C.dim}drive: authenticated · Mirror folder ${folderId}${C.reset}`)
    log()
  }

  let okCount = 0
  let errCount = 0
  let counter = 0
  const total = queue.length

  await runQueue(
    queue,
    async (item) => {
      const i = ++counter
      try {
        if (dryRun) {
          log(`[${i}/${total}] ${C.cyan}DRY${C.reset}: ${item.docId} ${item.ext} ` +
            `${C.dim}${humanBytes(item.size)} ← ${item.localPath}${C.reset}`)
          return
        }
        const fileId = await uploadMirror(item)
        progress.mirrored[item.docId] = {
          driveFileId: fileId,
          ext: item.ext,
          mimeType: item.mimeType,
          bytes: item.size,
          sourceUrl: item.sourceUrl,
          mirroredAt: new Date().toISOString(),
        }
        if (i % 25 === 0) saveProgress(progress)
        okCount++
        log(`[${i}/${total}] ${C.green}OK${C.reset}: ${item.docId}.${item.ext} → ${C.blue}${fileId}${C.reset}`)
      } catch (err) {
        errCount++
        logErr(`[${i}/${total}] ${C.red}FAIL${C.reset}: ${item.docId} — ${err?.message || err}`)
      }
    },
    concurrency,
  )

  if (!dryRun) saveProgress(progress)

  log()
  log(`${C.bold}done.${C.reset} ok=${okCount} fail=${errCount}` +
    (dryRun ? `  ${C.dim}(dry-run, nothing uploaded)${C.reset}` : ''))
  if (!dryRun && okCount > 0) {
    log(`${C.dim}Next: node scripts/edirect/build-procedures.mjs — bakes the new` +
      ` mirrorFileId values into public/procedures.json.${C.reset}`)
  }
}

main().catch((err) => {
  logErr(`${C.red}fatal:${C.reset} ${err?.stack || err}`)
  process.exit(1)
})
