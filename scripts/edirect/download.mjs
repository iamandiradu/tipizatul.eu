#!/usr/bin/env node
/**
 * Downloads documents listed in index.json.
 * Files are organised into folders by institution name.
 * Skips files that already exist on disk (incremental).
 *
 * Usage:
 *   node scripts/edirect/download.mjs                  # download all
 *   node scripts/edirect/download.mjs --ext pdf         # only PDFs
 *   node scripts/edirect/download.mjs --ext pdf,docx    # PDFs and DOCX
 *   node scripts/edirect/download.mjs --dry-run         # show what would be downloaded
 *   node scripts/edirect/download.mjs --concurrency 5   # parallel downloads (default: 3)
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_PATH = resolve(__dirname, 'index.json')
const OUT_DIR = resolve(__dirname, 'downloads')
const PROGRESS_PATH = resolve(__dirname, 'download-progress.json')

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const dryRun = args.includes('--dry-run')
const extFilter = getArg('ext')?.split(',').map(e => e.trim().toLowerCase()) ?? null
const concurrency = parseInt(getArg('concurrency') ?? '3', 10)

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
}

function entryPath(entry) {
  const folder = sanitize(entry.institution || 'Unknown')
  const ext = entry.fileExtension || 'bin'
  const base = sanitize(entry.documentName || entry.id)
  const filename = `${base}_${entry.id}.${ext}`
  return join(folder, filename)
}

function loadProgress() {
  if (existsSync(PROGRESS_PATH)) {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'))
  }
  return { downloaded: {}, failed: {} }
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8')
}

async function downloadFile(url, destPath) {
  const fullPath = join(OUT_DIR, destPath)
  const dir = dirname(fullPath)
  mkdirSync(dir, { recursive: true })

  const res = await fetch(url, {
    headers: { 'User-Agent': 'tipizatul.eu-scraper/1.0' },
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }

  await pipeline(Readable.fromWeb(res.body), createWriteStream(fullPath))
  return fullPath
}

async function processQueue(entries, progress) {
  let completed = 0
  let skipped = 0
  let failed = 0
  const total = entries.length
  let idx = 0

  async function worker() {
    while (idx < entries.length) {
      const i = idx++
      const entry = entries[i]
      const dest = entryPath(entry)
      const fullPath = join(OUT_DIR, dest)

      // Skip if already downloaded or file exists on disk
      if (progress.downloaded[entry.id] || existsSync(fullPath)) {
        skipped++
        continue
      }

      if (!entry.downloadUrl) {
        failed++
        progress.failed[entry.id] = 'No download URL'
        continue
      }

      try {
        await downloadFile(entry.downloadUrl, dest)
        progress.downloaded[entry.id] = { path: dest, at: new Date().toISOString() }
        completed++

        if ((completed + skipped + failed) % 50 === 0) {
          const pct = (((completed + skipped + failed) / total) * 100).toFixed(1)
          process.stderr.write(`  [${pct}%] ${completed} downloaded, ${skipped} skipped, ${failed} failed\n`)
          saveProgress(progress)
        }
      } catch (err) {
        failed++
        progress.failed[entry.id] = err.message
        process.stderr.write(`  FAIL ${entry.id}: ${err.message}\n`)
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)

  return { completed, skipped, failed }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(INDEX_PATH)) {
    console.error('index.json not found. Run fetch-index.mjs first.')
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
  let entries = manifest.entries

  // Filter by extension
  if (extFilter) {
    entries = entries.filter(e => extFilter.includes(e.fileExtension))
    console.log(`Filtered to ${entries.length} entries (extensions: ${extFilter.join(', ')})`)
  } else {
    console.log(`Total entries: ${entries.length}`)
  }

  // Filter out entries with no download URL
  entries = entries.filter(e => e.downloadUrl)
  console.log(`Downloadable: ${entries.length}`)

  if (dryRun) {
    const progress = loadProgress()
    const pending = entries.filter(e => !progress.downloaded[e.id] && !existsSync(join(OUT_DIR, entryPath(e))))
    console.log(`Would download: ${pending.length} files`)
    console.log(`Already done: ${entries.length - pending.length}`)
    return
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const progress = loadProgress()

  console.log(`Downloading with concurrency=${concurrency}...`)
  const result = await processQueue(entries, progress)

  saveProgress(progress)
  console.log(`\nDone: ${result.completed} downloaded, ${result.skipped} skipped, ${result.failed} failed`)
  console.log(`Files saved to: ${OUT_DIR}`)
}

main().catch(err => { console.error(err); process.exit(1) })
