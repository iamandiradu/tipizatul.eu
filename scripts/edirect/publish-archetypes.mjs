#!/usr/bin/env node
/**
 * publish-archetypes.mjs — Phase 5 publish for authored archetypes.
 *
 * upload-templates.mjs handles the *detector* route: it walks
 * paddle/output/bundle-N/ and publishes one template per detected document.
 * Authored archetypes work the other way round — one hand-written template is
 * shared by every document that matched it (roadmap decision 1: no stamped
 * instances, institution supplied at fill time via `?institution=`) — so they
 * need their own publisher. This is it.
 *
 * Per archetype:
 *   1. Upload templates/dist/<id>.pdf to Drive `Tipizatul.eu/PDFs/`, public.
 *   2. Read templates/dist/<id>.template.json (already Template-shaped, with
 *      driveFileId stubbed empty by build.mjs).
 *   3. Attach `eDirectDocIds` — every document this archetype serves.
 *   4. Write Firestore `templates/<id>`.
 *
 * ── Which joins are published ───────────────────────────────────────────────
 * A wrong join is worse than a missing one: it shows a citizen a form that is
 * not the one their procedure asks for, wearing a "verified" badge. So only
 * joins backed by actual text evidence ship:
 *
 *   strong       matchScore >= 0.75         40 docs /  552 files   PUBLISHED
 *   adjudicated  matchScore 0.35-0.75, confirmed by adjudicate_queue.py
 *                content rules              35 docs /   54 files   PUBLISHED
 *   promoted     re-scored by score-held-joins.mjs and cleared the same
 *                0.35 bar                    5 docs /  182 files   PUBLISHED
 *   candidate    matchCandidate, unconfirmed 6 docs                HELD
 *   guess        archetypeGuess only, no text evidence (mostly LLM)
 *                                           94 docs                HELD
 *
 * The held remainder was not merely unreviewed — it was measured.
 * score-held-joins.mjs re-scored all 99 held docs against the archetype
 * reference texts, calibrating first on the 40 known-strong docs (mean 0.678).
 * 94 of 99 scored below 0.35 against the archetype the LLM assigned them, and
 * 10 matched some OTHER archetype better. Those are wrong joins, not missing
 * ones, so --include-guesses now means "publish joins already shown to be
 * unsupported". Do not use it.
 *
 * --update-joins refreshes eDirectDocIds on already-published archetypes
 * without re-uploading their PDFs (which would orphan the originals).
 *
 * Prerequisites: GOOGLE_SERVICE_ACCOUNT_KEY (Firestore) and
 * GOOGLE_OAUTH_CLIENT_KEY (Drive), both readable from .env or the environment.
 *
 * Usage
 * -----
 *   node scripts/edirect/publish-archetypes.mjs --dry-run
 *   node scripts/edirect/publish-archetypes.mjs --only cerere-tip
 *   node scripts/edirect/publish-archetypes.mjs
 *   node scripts/edirect/publish-archetypes.mjs --include-guesses   # see above
 */

import { readFileSync, writeFileSync, existsSync, createReadStream, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

// `.env.local` first — that is where this project's real secrets live, and
// `dotenv/config` alone reads only `.env`, which silently yields "key not set".
import dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { google } from 'googleapis'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, 'templates/dist')
const SPECS_DIR = resolve(__dirname, 'templates/specs')
const MANIFEST_PATH = resolve(__dirname, 'manifest/manifest.json')
const PROMOTED_PATH = resolve(__dirname, 'manifest/promoted-joins.json')
const AUTHORED_PATH = resolve(__dirname, 'manifest/authored-joins.json')
// Non-eDirect sources publish their own authored-from joins, in the same shape
// and to the same standard (the replica was written from the document it
// serves). One file per source directory under scripts/sources/.
const SOURCE_JOIN_PATHS = [resolve(__dirname, '../sources/dasm-cluj/archetype-joins.json')]
const PROGRESS_PATH = resolve(__dirname, 'publish-archetypes-progress.json')
const OAUTH_TOKEN_PATH = resolve(__dirname, '.oauth-token.json')
const OAUTH_LOOPBACK_PORT = parseInt(process.env.OAUTH_LOOPBACK_PORT || '53682', 10)
const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}`

const DRIVE_ROOT_NAME = 'Tipizatul.eu'
const DRIVE_PDFS_NAME = 'PDFs'

const STRONG_THRESHOLD = 0.75

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null }
const dryRun = args.includes('--dry-run')
const includeGuesses = args.includes('--include-guesses')
// Refresh eDirectDocIds on already-published archetypes without re-uploading.
const updateJoins = args.includes('--update-joins')
const only = getArg('only')

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
}
const log = (s = '') => process.stdout.write(s + '\n')
const logErr = (s) => process.stderr.write(s + '\n')

// ── Auth ─────────────────────────────────────────────────────────────────────

function parseJsonEnv(name) {
  const raw = process.env[name]
  if (!raw) throw new Error(`${name} not set (env or .env)`)
  const t = raw.trim()
  if (t.startsWith('{')) return JSON.parse(t)
  if (existsSync(t)) return JSON.parse(readFileSync(t, 'utf-8'))
  return JSON.parse(Buffer.from(t, 'base64').toString('utf-8'))
}

function persistTokens(tokens) {
  const existing = existsSync(OAUTH_TOKEN_PATH)
    ? JSON.parse(readFileSync(OAUTH_TOKEN_PATH, 'utf-8'))
    : {}
  writeFileSync(OAUTH_TOKEN_PATH, JSON.stringify({ ...existing, ...tokens }, null, 2))
}

async function runConsentFlow(oauth) {
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline', prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  })
  const code = await new Promise((res, rej) => {
    const server = createServer((req, resp) => {
      const url = new URL(req.url, OAUTH_REDIRECT_URI)
      const c = url.searchParams.get('code')
      const err = url.searchParams.get('error')
      resp.writeHead(200, { 'Content-Type': 'text/plain' })
      if (err) { resp.end(`Auth error: ${err}`); server.close(); rej(new Error(err)); return }
      if (c) { resp.end('Authentication successful. You can close this tab.'); server.close(); res(c) }
      else resp.end('Waiting for OAuth code...')
    })
    server.listen(OAUTH_LOOPBACK_PORT, '127.0.0.1', () => {
      log(`${C.cyan}OAuth consent required.${C.reset} Open this URL:`)
      log(`  ${authUrl}`)
      try {
        const [cmd, cmdArgs] =
          process.platform === 'win32' ? ['cmd', ['/c', 'start', '', authUrl]]
            : process.platform === 'darwin' ? ['open', [authUrl]] : ['xdg-open', [authUrl]]
        spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).unref()
      } catch { /* paste it manually */ }
    })
    server.on('error', rej)
  })
  const { tokens } = await oauth.getToken(code)
  oauth.setCredentials(tokens)
  persistTokens(tokens)
}

// Promise-memoized, not value-memoized: concurrent callers must await the same
// consent rather than each opening a loopback server on the same port.
let _drivePromise = null
function getDrive() {
  if (_drivePromise) return _drivePromise
  _drivePromise = (async () => {
    const cfg = (() => { const j = parseJsonEnv('GOOGLE_OAUTH_CLIENT_KEY'); return j.installed || j.web || j })()
    const oauth = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, OAUTH_REDIRECT_URI)
    if (existsSync(OAUTH_TOKEN_PATH)) {
      oauth.setCredentials(JSON.parse(readFileSync(OAUTH_TOKEN_PATH, 'utf-8')))
    } else {
      await runConsentFlow(oauth)
    }
    oauth.on('tokens', persistTokens)
    return google.drive({ version: 'v3', auth: oauth })
  })().catch((e) => { _drivePromise = null; throw e })
  return _drivePromise
}

let _db = null
function getFirestore() {
  if (_db) return _db
  const credentials = parseJsonEnv('GOOGLE_SERVICE_ACCOUNT_KEY')
  if (!credentials.private_key || !credentials.client_email) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not a service-account key (no private_key/client_email). ' +
      'An OAuth client JSON will not work for Firestore.',
    )
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id || process.env.FIREBASE_PROJECT_ID,
    })
  }
  _db = admin.firestore()
  return _db
}

async function withBackoff(fn) {
  let delay = 2000
  for (let attempt = 0; attempt < 6; attempt++) {
    try { return await fn() } catch (err) {
      const code = err?.code || err?.response?.status
      if (!(code === 429 || (code >= 500 && code < 600)) || attempt === 5) throw err
      logErr(`${C.yellow}  rate-limited (${code}), backing off ${delay}ms${C.reset}`)
      await new Promise((r) => setTimeout(r, Math.min(delay, 60_000)))
      delay *= 2
    }
  }
}

let _pdfsFolderPromise = null
function getPdfsFolderId() {
  if (_pdfsFolderPromise) return _pdfsFolderPromise
  _pdfsFolderPromise = (async () => {
    const drive = await getDrive()
    const find = async (name, parentId) => {
      const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`
      const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and ${parentClause} and trashed=false`
      const list = await drive.files.list({ q, fields: 'files(id)', pageSize: 1, supportsAllDrives: true })
      if (list.data.files?.length) return list.data.files[0].id
      const made = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined },
        fields: 'id', supportsAllDrives: true,
      })
      return made.data.id
    }
    const root = await find(DRIVE_ROOT_NAME, null)
    return find(DRIVE_PDFS_NAME, root)
  })().catch((e) => { _pdfsFolderPromise = null; throw e })
  return _pdfsFolderPromise
}

async function uploadPdf(localPath, displayName) {
  const drive = await getDrive()
  const folderId = await getPdfsFolderId()
  const created = await withBackoff(() => drive.files.create({
    requestBody: { name: `${displayName}.pdf`, mimeType: 'application/pdf', parents: [folderId] },
    media: { mimeType: 'application/pdf', body: createReadStream(localPath) },
    fields: 'id', supportsAllDrives: true,
  }))
  const fileId = created.data.id
  await withBackoff(() => drive.permissions.create({
    fileId, requestBody: { role: 'reader', type: 'anyone' }, supportsAllDrives: true,
  }))
  return fileId
}

// ── Join map: archetype -> eDirectDocIds ─────────────────────────────────────

// Filenames carry the eDirect document id as a `_<digits>` suffix before the
// extension. That is the join key the app uses; never trust the display name.
function docIdFromPath(p) {
  const m = /_(\d+)\.[A-Za-z0-9()]+$/.exec(p)
  return m ? m[1] : null
}

function buildJoinMap() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
  const byArchetype = new Map()
  const stats = { strong: 0, adjudicated: 0, candidate: 0, guess: 0, filesJoined: 0, filesHeld: 0, promoted: 0, authored: 0, sourceAuthored: 0 }

  // Joins rescued by score-held-joins.mjs: docs the LLM guessed, re-scored
  // against the archetype's reference text, and kept only where the wording
  // actually matches at the same threshold the adjudicated tier already uses.
  // This is evidence, so it merges in by default — unlike --include-guesses,
  // which ships the unscored remainder.
  // Strongest evidence first: replicas authored FROM a known corpus document
  // serve every copy of it by construction, with no threshold involved.
  if (existsSync(AUTHORED_PATH)) {
    const authored = JSON.parse(readFileSync(AUTHORED_PATH, 'utf-8'))
    for (const [id, v] of Object.entries(authored.archetypes || {})) {
      const bucket = byArchetype.get(id) ?? new Set()
      for (const docId of v.docIds || []) bucket.add(String(docId))
      byArchetype.set(id, bucket)
      stats.authored += (v.docIds || []).length
    }
  }

  // Same standard as the authored joins above, from the non-eDirect sources.
  for (const path of SOURCE_JOIN_PATHS) {
    if (!existsSync(path)) continue
    const src = JSON.parse(readFileSync(path, 'utf-8'))
    for (const [id, v] of Object.entries(src.archetypes || {})) {
      const bucket = byArchetype.get(id) ?? new Set()
      for (const docId of v.docIds || []) bucket.add(String(docId))
      byArchetype.set(id, bucket)
      stats.sourceAuthored += (v.docIds || []).length
    }
  }

  if (existsSync(PROMOTED_PATH)) {
    const promoted = JSON.parse(readFileSync(PROMOTED_PATH, 'utf-8'))
    for (const [id, v] of Object.entries(promoted.archetypes || {})) {
      const bucket = byArchetype.get(id) ?? new Set()
      for (const docId of v.docIds || []) bucket.add(String(docId))
      byArchetype.set(id, bucket)
      stats.promoted += (v.docIds || []).length
    }
  }

  for (const d of manifest.uniqueDocs || []) {
    const c = d.classification || {}
    if (c.route !== 'R2' || !c.archetypeGuess) continue

    let tier
    if (typeof c.matchScore === 'number') tier = c.matchScore >= STRONG_THRESHOLD ? 'strong' : 'adjudicated'
    else if (c.matchCandidate) tier = 'candidate'
    else tier = 'guess'
    stats[tier]++

    const trusted = tier === 'strong' || tier === 'adjudicated'
    const copies = d.copies || []
    if (!trusted && !includeGuesses) { stats.filesHeld += copies.length; continue }
    stats.filesJoined += copies.length

    const bucket = byArchetype.get(c.archetypeGuess) ?? new Set()
    for (const p of copies) { const id = docIdFromPath(p); if (id) bucket.add(id) }
    byArchetype.set(c.archetypeGuess, bucket)
  }
  return { byArchetype, stats }
}

// ── Progress ─────────────────────────────────────────────────────────────────

const loadProgress = () =>
  existsSync(PROGRESS_PATH) ? JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8')) : { published: {} }
const saveProgress = (p) => writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), 'utf-8')

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`${C.bold}publish-archetypes.mjs${C.reset}${C.dim} — ${dryRun ? 'DRY-RUN' : 'LIVE'}${C.reset}`)

  // dist/ also accumulates one-off instance builds (`build.mjs <id>
  // --institution "…"` writes `<id>-<slug>`), which are scratch output, not
  // publishable forms. An id is publishable only if a spec authored it.
  const specIds = new Set(
    readdirSync(SPECS_DIR)
      .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
      .map((f) => f.replace(/\.mjs$/, '')),
  )

  const allDist = readdirSync(DIST_DIR)
    .filter((f) => f.endsWith('.template.json'))
    .map((f) => f.replace(/\.template\.json$/, ''))
  const ids = allDist.filter((id) => specIds.has(id) && (!only || id === only)).sort()
  const dropped = allDist.filter((id) => !specIds.has(id))
  if (dropped.length) {
    log(`${C.dim}ignoring ${dropped.length} non-spec build(s) in dist/: ${dropped.join(', ')}${C.reset}`)
  }

  const { byArchetype, stats } = buildJoinMap()
  log(`${C.dim}join evidence — strong ${stats.strong}, adjudicated ${stats.adjudicated}, ` +
    `candidate ${stats.candidate}, guess ${stats.guess} (unique docs)${C.reset}`)
  log(`${C.dim}authored-from joins: ${stats.authored} docIds (+${stats.sourceAuthored} from non-eDirect sources) · promoted from re-scoring: ${stats.promoted} docIds${C.reset}`)
  log(`${C.dim}files joined: ${stats.filesJoined}` +
    (stats.filesHeld ? ` · held back for review: ${stats.filesHeld} ${C.yellow}(--include-guesses to publish)${C.reset}${C.dim}` : '') +
    `${C.reset}`)
  if (includeGuesses) {
    log(`${C.yellow}WARNING: --include-guesses is on. Joins with no text evidence will be published.${C.reset}`)
  }
  log()

  // Validate BOTH credentials before uploading anything. Publishing is
  // Drive-then-Firestore, so a missing Firestore key discovered mid-loop
  // leaves every uploaded PDF orphaned in Drive with no template pointing at
  // it — which is exactly what happened the first time this ran.
  if (!dryRun) {
    getFirestore()
    // --update-joins patches Firestore only, so demanding Drive credentials
    // would block a run that never touches Drive.
    if (!updateJoins) await getDrive()
    log(`${C.dim}credentials ok — Firestore${updateJoins ? '' : ' and Drive'} reachable${C.reset}\n`)
  }

  const progress = loadProgress()
  let ok = 0, skipped = 0, failed = 0

  for (const id of ids) {
    const pdfPath = resolve(DIST_DIR, `${id}.pdf`)
    const jsonPath = resolve(DIST_DIR, `${id}.template.json`)
    if (!existsSync(pdfPath)) { logErr(`${C.red}SKIP${C.reset} ${id} — no built PDF`); skipped++; continue }
    const prior = progress.published[id]
    if (prior && !updateJoins) { skipped++; continue }

    const tpl = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    const docIds = [...(byArchetype.get(id) ?? [])].sort()

    // Joins-only refresh for an archetype already published: patch
    // eDirectDocIds in place and leave Drive alone. Re-running the full path
    // would upload a second copy of an unchanged PDF and orphan the first.
    if (updateJoins && prior) {
      if (dryRun) {
        log(`[${C.cyan}DRY${C.reset}] ${id.padEnd(34)} joins ${String(prior.docIds).padStart(4)} → ${String(docIds.length).padStart(4)}`)
        continue
      }
      if (docIds.length === prior.docIds) { skipped++; continue }
      try {
        await withBackoff(() => getFirestore().collection('templates').doc(id).update({ eDirectDocIds: docIds }))
        progress.published[id] = { ...prior, docIds: docIds.length, joinsUpdatedAt: new Date().toISOString() }
        saveProgress(progress)
        ok++
        log(`${C.green}OK${C.reset}   ${id.padEnd(34)} joins ${prior.docIds} → ${C.blue}${docIds.length}${C.reset}`)
      } catch (err) {
        failed++
        logErr(`${C.red}FAIL${C.reset} ${id} — ${err?.message || err}`)
      }
      continue
    }

    if (dryRun) {
      log(`[${C.cyan}DRY${C.reset}] ${id.padEnd(34)} ${String(tpl.fields?.length ?? 0).padStart(2)} fields  ` +
        `→ ${String(docIds.length).padStart(4)} eDirectDocIds`)
      continue
    }

    let uploadedFileId = null
    try {
      const driveFileId = await uploadPdf(pdfPath, tpl.name || id)
      uploadedFileId = driveFileId
      const doc = {
        ...tpl,
        driveFileId,
        acroFormOrigin: 'generated',
        archetype: id,
        ...(docIds.length ? { eDirectDocIds: docIds } : {}),
        createdAt: tpl.createdAt || new Date().toISOString(),
        version: tpl.version ?? 1,
      }
      await withBackoff(() => getFirestore().collection('templates').doc(id).set(doc, { merge: true }))
      progress.published[id] = { driveFileId, docIds: docIds.length, at: new Date().toISOString() }
      saveProgress(progress)
      ok++
      log(`${C.green}OK${C.reset}   ${id.padEnd(34)} → ${C.blue}${driveFileId}${C.reset}  (${docIds.length} docs)`)
    } catch (err) {
      failed++
      logErr(`${C.red}FAIL${C.reset} ${id} — ${err?.message || err}`)
      // Roll the Drive upload back, so a retry does not create a second copy
      // and the folder does not accumulate files no template references.
      if (uploadedFileId) {
        try {
          const drive = await getDrive()
          await drive.files.update({ fileId: uploadedFileId, requestBody: { trashed: true }, supportsAllDrives: true })
          logErr(`${C.dim}     rolled back Drive upload ${uploadedFileId}${C.reset}`)
        } catch (rollbackErr) {
          logErr(`${C.yellow}     could not roll back ${uploadedFileId} — trash it manually: ${rollbackErr?.message}${C.reset}`)
        }
      }
    }
  }

  log()
  log(`${C.bold}done.${C.reset} published=${ok} skipped=${skipped} failed=${failed}` +
    (dryRun ? `  ${C.dim}(dry-run, nothing written)${C.reset}` : ''))
  if (!dryRun && ok > 0) log(`${C.dim}Next: npm run catalog:rebuild${C.reset}`)
}

main().catch((err) => { logErr(`${C.red}fatal:${C.reset} ${err?.stack || err}`); process.exit(1) })
