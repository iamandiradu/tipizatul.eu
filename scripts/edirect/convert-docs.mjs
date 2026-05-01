#!/usr/bin/env node
/**
 * Convert .doc / .docx files into AcroForm PDFs.
 *
 * Per file:
 *   1. LibreOffice headless renders source → PDF (cached in pdf-from-doc/)
 *   2. parsePdf + detectFields + associateLabels detect form fields
 *   3. addAcroFormFields writes a fillable PDF to processed/ or needs-review/
 *
 * Usage:
 *   node scripts/edirect/convert-docs.mjs <input.doc|.docx>
 *   node scripts/edirect/convert-docs.mjs --batch <dir>
 *   node scripts/edirect/convert-docs.mjs --batch <dir> --dry-run --verbose
 *   node scripts/edirect/convert-docs.mjs --batch <dir> --in-place
 *
 * --in-place writes the AcroForm PDF next to the source (same basename, .pdf
 * extension) and deletes the source .doc/.docx afterward. The source is only
 * deleted after the PDF has been written and fsynced.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, renameSync, unlinkSync, openSync, fsyncSync, closeSync } from 'node:fs'
import { resolve, dirname, basename, join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync, spawn } from 'node:child_process'
import { argv as procArgv, execPath } from 'node:process'

import { parsePdf } from './lib/content-stream-parser.mjs'
import { detectFields } from './lib/field-detector.mjs'
import { associateLabels } from './lib/label-associator.mjs'
import { addAcroFormFields } from './lib/acroform-writer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROCESSED_DIR = resolve(__dirname, 'processed')
const REVIEW_DIR = resolve(__dirname, 'needs-review')
const PDF_CACHE_DIR = resolve(__dirname, 'pdf-from-doc')

const CONFIDENCE_THRESHOLD = 0.99
const SUPPORTED_EXTS = new Set(['.doc', '.docx'])

// ── soffice discovery ───────────────────────────────────────────────────────

const SOFFICE_CANDIDATES = [
  process.env.SOFFICE_BIN,
  'soffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  '/opt/homebrew/bin/soffice',
].filter(Boolean)

function findSoffice() {
  for (const candidate of SOFFICE_CANDIDATES) {
    const r = spawnSync(candidate, ['--version'], { stdio: 'ignore' })
    if (r.status === 0) return candidate
  }
  return null
}

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const batchDir = getArg('batch')
const baseFlag = getArg('base')
const verbose = args.includes('--verbose')
const dryRun = args.includes('--dry-run')
const keepCache = args.includes('--keep-cache')
const inPlace = args.includes('--in-place')
const perFileTimeoutMs = parseInt(getArg('per-file-timeout-ms') ?? '180000', 10)
const concurrency = Math.max(1, parseInt(getArg('concurrency') ?? '1', 10))
const FAILED_LIST_PATH = resolve(__dirname, 'convert-docs-failed.json')
const positionalArgs = args.filter((a, i) => {
  if (a.startsWith('--')) return false
  const prev = args[i - 1]
  // Drop values that follow a flag we recognize as taking an argument.
  if (prev === '--batch' || prev === '--base' || prev === '--per-file-timeout-ms') return false
  return true
})
const inputFile = positionalArgs[0]

// ── Helpers ─────────────────────────────────────────────────────────────────

function findDocs(dir) {
  const results = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else if (SUPPORTED_EXTS.has(extname(full).toLowerCase())) results.push(full)
    }
  }
  walk(dir)
  return results
}

/**
 * Convert a .doc/.docx file to PDF via LibreOffice headless.
 * Caches the result so subsequent runs skip the conversion.
 *
 * The cache filename preserves the source extension before .pdf so that
 * "Cerere.doc" and "Cerere.docx" sitting in the same folder don't collide.
 */
function convertToPdf(srcPath, cachePdfPath, soffice) {
  if (existsSync(cachePdfPath)) return cachePdfPath

  const outDir = dirname(cachePdfPath)
  mkdirSync(outDir, { recursive: true })

  // Each concurrent worker runs in its own Node child process. Pinning the
  // LibreOffice user profile to this PID prevents the "user installation
  // already in use" lock when multiple soffice instances run in parallel.
  const userInstall = `file:///tmp/soffice-profile-${process.pid}`

  const r = spawnSync(soffice, [
    '--headless',
    '--norestore',
    '--nologo',
    '--nofirststartwizard',
    `-env:UserInstallation=${userInstall}`,
    '--convert-to', 'pdf',
    '--outdir', outDir,
    srcPath,
  ], { encoding: 'utf-8' })

  if (r.status !== 0) {
    throw new Error(`soffice failed (status ${r.status}): ${(r.stderr || r.stdout || '').trim()}`)
  }

  // soffice writes <basename-without-src-ext>.pdf into outDir.
  const sofficeOutput = join(outDir, basename(srcPath).replace(/\.(docx?)$/i, '.pdf'))
  if (!existsSync(sofficeOutput)) {
    throw new Error(`Expected PDF not produced by soffice: ${sofficeOutput}`)
  }
  if (sofficeOutput !== cachePdfPath) {
    renameSync(sofficeOutput, cachePdfPath)
  }
  return cachePdfPath
}

function cachePathFor(srcPath, baseDir) {
  // Cache mirrors source layout under PDF_CACHE_DIR. Keep the source
  // extension as part of the filename to avoid .doc/.docx collisions.
  const rel = baseDir ? relative(baseDir, srcPath) : basename(srcPath)
  return join(PDF_CACHE_DIR, `${rel}.pdf`)
}

// ── Pipeline ────────────────────────────────────────────────────────────────

function writeAndFsync(destPath, bytes) {
  mkdirSync(dirname(destPath), { recursive: true })
  writeFileSync(destPath, bytes)
  const fd = openSync(destPath, 'r')
  try { fsyncSync(fd) } finally { closeSync(fd) }
}

async function processFile(srcPath, baseDir, soffice) {
  const cachePdf = cachePathFor(srcPath, baseDir)

  if (dryRun) {
    console.log(`  ${srcPath} → ${cachePdf}`)
    return { skipped: false, isProcessed: null, fieldCount: null }
  }

  // In --in-place mode, target sits next to source with the .pdf extension.
  // If a same-name .pdf already exists, skip — never overwrite a different file.
  const inPlaceTarget = inPlace
    ? join(dirname(srcPath), basename(srcPath).replace(/\.(docx?)$/i, '.pdf'))
    : null
  if (inPlace && existsSync(inPlaceTarget)) {
    if (verbose) console.log(`  SKIP ${srcPath} (target already exists: ${inPlaceTarget})`)
    return { skipped: true, isProcessed: null, fieldCount: null, replaced: false }
  }

  convertToPdf(srcPath, cachePdf, soffice)

  const pdfBytes = readFileSync(cachePdf)
  const pages = await parsePdf(pdfBytes)

  let allFields = []
  for (const page of pages) {
    allFields = allFields.concat(detectFields(page))
  }
  const labeled = associateLabels(allFields, pages)

  const avgConfidence = labeled.length > 0
    ? labeled.reduce((sum, f) => sum + f.confidence, 0) / labeled.length
    : 0
  const isProcessed = avgConfidence >= CONFIDENCE_THRESHOLD

  if (verbose) {
    console.log(`  ${srcPath}`)
    console.log(`    Pages: ${pages.length}, Fields: ${labeled.length}, Confidence: ${(avgConfidence * 100).toFixed(1)}%`)
  }

  // Build the final PDF: AcroForm if we found fields, plain converted PDF otherwise.
  // In --in-place mode we always emit a PDF so the source can be safely deleted.
  // In default mode we still skip when there are no fields, matching detect-fields.mjs.
  if (labeled.length === 0 && !inPlace) {
    if (verbose) console.log('    No fields detected, skipping output.')
    return { skipped: true, isProcessed: false, fieldCount: 0 }
  }

  const resultBytes = labeled.length > 0
    ? await addAcroFormFields(pdfBytes, labeled)
    : pdfBytes

  let destPath
  if (inPlace) {
    destPath = inPlaceTarget
  } else {
    const targetRoot = isProcessed ? PROCESSED_DIR : REVIEW_DIR
    const relForOutput = baseDir ? relative(baseDir, srcPath) : basename(srcPath)
    destPath = join(targetRoot, `${relForOutput}.pdf`)
  }

  writeAndFsync(destPath, resultBytes)

  let replaced = false
  if (inPlace) {
    // Source removal happens only after the PDF is on disk and fsynced.
    unlinkSync(srcPath)
    replaced = true
    // Cache PDF is no longer useful once the source is gone.
    try { unlinkSync(cachePdf) } catch {}
    console.log(`  → ${destPath} (${labeled.length} fields, ${(avgConfidence * 100).toFixed(0)}%) — source removed`)
  } else {
    console.log(`  → ${destPath} (${labeled.length} fields, ${(avgConfidence * 100).toFixed(0)}%)`)
  }

  return { skipped: false, isProcessed, fieldCount: labeled.length, replaced }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const soffice = dryRun ? null : findSoffice()
  if (!dryRun && !soffice) {
    console.error('LibreOffice (soffice) not found. Install LibreOffice or set SOFFICE_BIN.')
    console.error('Tried:', SOFFICE_CANDIDATES.join(', '))
    process.exit(1)
  }

  if (batchDir) {
    const absDir = resolve(batchDir)
    if (!existsSync(absDir)) {
      console.error(`Directory not found: ${absDir}`)
      process.exit(1)
    }

    const docs = findDocs(absDir)
    console.log(`Found ${docs.length} .doc/.docx files in ${absDir}`)
    if (docs.length === 0) return

    // Skip files that are already on the failure list (timeouts, parse hangs).
    // macOS readdir returns NFD strings; the JSON file may hold NFC. Normalize.
    const norm = s => s.normalize('NFC')
    const failedList = existsSync(FAILED_LIST_PATH)
      ? JSON.parse(readFileSync(FAILED_LIST_PATH, 'utf-8'))
      : { failures: [] }
    const failedSet = new Set(failedList.failures.map(f => norm(f.path)))
    if (failedSet.size > 0) {
      console.log(`Skipping ${failedSet.size} previously-failed files (see ${FAILED_LIST_PATH})`)
    }

    function recordFailure(srcPath, reason) {
      const key = norm(srcPath)
      if (failedSet.has(key)) return
      failedSet.add(key)
      failedList.failures.push({ path: srcPath, reason, at: new Date().toISOString() })
      writeFileSync(FAILED_LIST_PATH, JSON.stringify(failedList, null, 2))
    }

    let processed = 0, skipped = 0, failed = 0
    let completed = 0

    // Each file runs in a child Node process with a hard timeout. This isolates
    // pathological PDFs that send the parser into an infinite loop — SIGKILL
    // unblocks the batch. With --concurrency N, up to N children run in parallel,
    // each using its own LibreOffice user profile (set inside the child by PID).
    const scriptPath = procArgv[1]
    const childArgs = ['--in-place', '--base', absDir]
    if (verbose) childArgs.push('--verbose')

    function runOne(src) {
      return new Promise((resolveOne) => {
        const child = spawn(execPath, [scriptPath, src, ...childArgs], { stdio: 'inherit' })
        let timedOut = false
        const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, perFileTimeoutMs)
        child.on('exit', (code, signal) => {
          clearTimeout(timer)
          resolveOne({ code, signal, timedOut })
        })
        child.on('error', () => {
          clearTimeout(timer)
          resolveOne({ code: 1, signal: null, timedOut: false })
        })
      })
    }

    let nextIdx = 0
    async function worker() {
      while (true) {
        const i = nextIdx++
        if (i >= docs.length) break
        const src = docs[i]

        if (failedSet.has(norm(src))) { skipped++; completed++; continue }
        const target = join(dirname(src), basename(src).replace(/\.(docx?)$/i, '.pdf'))
        if (existsSync(target)) { skipped++; completed++; continue }

        if (dryRun) {
          console.log(`  ${src} → ${target}`)
          completed++
          continue
        }

        const r = await runOne(src)

        if (r.timedOut || r.signal === 'SIGKILL') {
          failed++
          recordFailure(src, `timeout after ${perFileTimeoutMs}ms`)
          console.error(`  TIMEOUT ${src}`)
        } else if (r.code !== 0) {
          failed++
          recordFailure(src, `exit ${r.code}`)
          console.error(`  FAIL ${src} (exit ${r.code})`)
        } else if (existsSync(target)) {
          processed++
        } else {
          skipped++
        }

        completed++
        if (completed % 25 === 0 || completed === docs.length) {
          console.log(`Progress: ${completed}/${docs.length} (${processed} processed, ${skipped} skipped, ${failed} failed)`)
        }
      }
    }

    console.log(`Running with concurrency=${concurrency}, per-file timeout=${perFileTimeoutMs}ms`)
    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    if (!dryRun) {
      console.log(`\nDone: ${processed} converted, ${skipped} skipped, ${failed} failed`)
      console.log(`(Failures recorded in ${FAILED_LIST_PATH}; re-running will skip them.)`)
    }
  } else if (inputFile) {
    const absPath = resolve(inputFile)
    if (!existsSync(absPath)) {
      console.error(`File not found: ${absPath}`)
      process.exit(1)
    }
    if (!SUPPORTED_EXTS.has(extname(absPath).toLowerCase())) {
      console.error(`Unsupported extension: ${extname(absPath)}. Expected .doc or .docx.`)
      process.exit(1)
    }
    const baseDirArg = baseFlag ? resolve(baseFlag) : null
    await processFile(absPath, baseDirArg, soffice)
  } else {
    console.error('Usage:')
    console.error('  node convert-docs.mjs <input.doc|.docx> [--in-place] [--base <dir>]')
    console.error('  node convert-docs.mjs --batch <dir> [--in-place] [--dry-run] [--verbose] [--per-file-timeout-ms <ms>] [--concurrency <N>]')
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
