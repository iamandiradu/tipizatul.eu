#!/usr/bin/env node
/**
 * Detect form fields in static PDFs and generate fillable AcroForm PDFs.
 *
 * Usage:
 *   node scripts/edirect/detect-fields.mjs <input.pdf>
 *   node scripts/edirect/detect-fields.mjs --batch <dir>
 *   node scripts/edirect/detect-fields.mjs <input.pdf> --json --verbose
 *   node scripts/edirect/detect-fields.mjs --batch <dir> --dry-run
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, basename, join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parsePdf } from './lib/content-stream-parser.mjs'
import { detectFields } from './lib/field-detector.mjs'
import { associateLabels } from './lib/label-associator.mjs'
import { addAcroFormFields } from './lib/acroform-writer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROCESSED_DIR = resolve(__dirname, 'processed')
const REVIEW_DIR = resolve(__dirname, 'needs-review')

const CONFIDENCE_THRESHOLD = 0.99

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function getArg(name) {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : null
}
const batchDir = getArg('batch')
const outputPath = getArg('output')
const verbose = args.includes('--verbose')
const dryRun = args.includes('--dry-run')
const emitJson = args.includes('--json')
const inputFile = args.find(a => !a.startsWith('--') && a !== getArg('batch') && a !== getArg('output'))

// ── Processing ───────────────────────────────────────────────────────────────

async function processFile(inputPath, outDir) {
  const pdfBytes = readFileSync(inputPath)

  // Parse
  const pages = await parsePdf(pdfBytes)

  // Detect fields per page
  let allFields = []
  for (const page of pages) {
    const detected = detectFields(page)
    allFields = allFields.concat(detected)
  }

  // Associate labels
  const labeled = associateLabels(allFields, pages)

  // Calculate document confidence
  const avgConfidence = labeled.length > 0
    ? labeled.reduce((sum, f) => sum + f.confidence, 0) / labeled.length
    : 0

  const isProcessed = avgConfidence >= CONFIDENCE_THRESHOLD

  if (verbose || dryRun) {
    console.log(`  File: ${inputPath}`)
    console.log(`  Pages: ${pages.length}, Fields detected: ${labeled.length}`)
    console.log(`  Avg confidence: ${(avgConfidence * 100).toFixed(1)}% → ${isProcessed ? 'processed' : 'needs-review'}`)
    if (verbose) {
      for (const f of labeled) {
        console.log(`    [${f.context}] ${f.type} "${f.label || '?'}" → ${f.pdfFieldName} (${(f.confidence * 100).toFixed(0)}%) at (${f.x.toFixed(0)}, ${f.y.toFixed(0)}) ${f.width.toFixed(0)}x${f.height.toFixed(0)}`)
      }
    }
  }

  if (dryRun) return { fields: labeled, avgConfidence, isProcessed }

  if (labeled.length === 0) {
    if (verbose) console.log('  No fields detected, skipping.')
    return { fields: labeled, avgConfidence, isProcessed }
  }

  // Generate AcroForm PDF
  const resultBytes = await addAcroFormFields(pdfBytes, labeled)

  // Determine output path
  let destPath
  if (outputPath) {
    destPath = outputPath
  } else if (outDir) {
    // Batch mode — maintain relative structure
    const targetDir = isProcessed ? PROCESSED_DIR : REVIEW_DIR
    destPath = join(targetDir, outDir, basename(inputPath))
  } else {
    // Single file mode
    const targetDir = isProcessed ? PROCESSED_DIR : REVIEW_DIR
    destPath = join(targetDir, basename(inputPath))
  }

  mkdirSync(dirname(destPath), { recursive: true })
  writeFileSync(destPath, resultBytes)
  console.log(`  → ${destPath}`)

  // Optionally emit JSON metadata
  if (emitJson) {
    const jsonPath = destPath.replace(/\.pdf$/i, '.fields.json')
    writeFileSync(jsonPath, JSON.stringify({
      source: inputPath,
      avgConfidence,
      isProcessed,
      fields: labeled.map(f => ({
        pdfFieldName: f.pdfFieldName,
        type: f.type,
        label: f.label,
        page: f.page,
        x: Math.round(f.x),
        y: Math.round(f.y),
        width: Math.round(f.width),
        height: Math.round(f.height),
        confidence: Math.round(f.confidence * 100) / 100,
        context: f.context,
        patternId: f.patternId,
        maxLength: f.maxLength,
        placeholder: f.placeholder,
      })),
    }, null, 2))
  }

  return { fields: labeled, avgConfidence, isProcessed }
}

function findPdfs(dir) {
  const results = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) walk(full)
      else if (extname(full).toLowerCase() === '.pdf') results.push(full)
    }
  }
  walk(dir)
  return results
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (batchDir) {
    const absDir = resolve(batchDir)
    if (!existsSync(absDir)) {
      console.error(`Directory not found: ${absDir}`)
      process.exit(1)
    }

    const pdfs = findPdfs(absDir)
    console.log(`Found ${pdfs.length} PDFs in ${absDir}`)

    let processed = 0, review = 0, skipped = 0, failed = 0

    for (let i = 0; i < pdfs.length; i++) {
      const relDir = relative(absDir, dirname(pdfs[i]))
      try {
        const result = await processFile(pdfs[i], relDir)
        if (result.fields.length === 0) skipped++
        else if (result.isProcessed) processed++
        else review++
      } catch (err) {
        failed++
        console.error(`  FAIL ${pdfs[i]}: ${err.message}`)
      }

      if ((i + 1) % 50 === 0 || i === pdfs.length - 1) {
        console.log(`Progress: ${i + 1}/${pdfs.length} (${processed} processed, ${review} review, ${skipped} skipped, ${failed} failed)`)
      }
    }

    console.log(`\nDone: ${processed} → processed/, ${review} → needs-review/, ${skipped} skipped, ${failed} failed`)

  } else if (inputFile) {
    const absPath = resolve(inputFile)
    if (!existsSync(absPath)) {
      console.error(`File not found: ${absPath}`)
      process.exit(1)
    }
    await processFile(absPath, null)

  } else {
    console.error('Usage:')
    console.error('  node detect-fields.mjs <input.pdf> [--output <path>] [--json] [--verbose]')
    console.error('  node detect-fields.mjs --batch <dir> [--dry-run] [--json] [--verbose]')
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
