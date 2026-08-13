#!/usr/bin/env node
/**
 * Verify an authored archetype round-trips through the real fill logic.
 *
 * Mirrors src/lib/pdf-fill.ts (text/checkbox path + NotoSans embed +
 * updateFieldAppearances + flatten) in Node, so we prove the authored PDF +
 * Template JSON actually fill and flatten before anything is published to
 * Firestore/Drive. Builds a Zod-equivalent presence check too.
 *
 * Usage:
 *   node verify-fill.mjs <id>            # uses built-in sample values
 *   node verify-fill.mjs cerere-tip
 *
 * Output: dist/<id>.filled.pdf
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { PDFDocument, PDFName } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(HERE, 'dist')
const FONT_PATH = resolve(HERE, '../../../public/fonts/NotoSans-Regular.ttf')

const id = process.argv[2]
if (!id) {
  console.error('Usage: node verify-fill.mjs <id>')
  process.exit(1)
}

const pdfPath = resolve(DIST, `${id}.pdf`)
const tmplPath = resolve(DIST, `${id}.template.json`)
if (!existsSync(pdfPath) || !existsSync(tmplPath)) {
  console.error(`Missing dist/${id}.pdf or dist/${id}.template.json — run build.mjs first.`)
  process.exit(1)
}

const template = JSON.parse(readFileSync(tmplPath, 'utf-8'))

// Sample values keyed by pdfFieldName. Fall back to a generic string for any
// field the sample doesn't name, so every required field is exercised.
const SAMPLE = {
  nume_si_prenume: 'Ionescu Maria-Elena',
  cnp: '2920512123456',
  telefon: '0721 234 567',
  adresa: 'Str. Libertății nr. 12, bl. A3, ap. 7',
  localitate: 'Cluj-Napoca',
  judet: 'Cluj',
  email: 'maria.ionescu@example.ro',
  obiectul_cererii:
    'Solicit eliberarea unei adeverințe care să ateste domiciliul meu actual, ' +
    'necesară pentru înscrierea copilului la unitatea de învățământ.',
  data: '24.06.2026',
  semnatura: 'Ionescu M.',
  institutie: 'Primăria Municipiului Cluj-Napoca',
}

/**
 * Resolve a value for any field: prefer the curated SAMPLE, else synthesize a
 * type-appropriate placeholder so archetype-specific fields (which SAMPLE
 * doesn't enumerate) still exercise the fill + presence check.
 */
function valueFor(f) {
  if (f.pdfFieldName in SAMPLE) return fitToField(SAMPLE[f.pdfFieldName], f)
  if (f.type === 'checkbox') return true
  if (f.isMultiline) return `Text de probă pentru „${f.label}".`
  return `Exemplu ${f.label}`.slice(0, f.maxLength || 60)
}

/**
 * Make a curated sample fit the field it is going into. Comb grids declare a
 * hard maxLength — a „Data" grid of 8 cells expects zzllaaaa with no
 * separators — and pdf-lib throws outright when the text is longer, which
 * reads as a broken archetype when the real problem is the sample. Strip
 * separators first (24.06.2026 -> 24062026), truncate only as a last resort.
 */
function fitToField(value, f) {
  if (typeof value !== 'string' || !f.maxLength || value.length <= f.maxLength) return value
  const stripped = value.replace(/[^\p{L}\p{N}]/gu, '')
  return stripped.length <= f.maxLength ? stripped : stripped.slice(0, f.maxLength)
}

// ── Presence validation (mirrors schema-builder's isRequired → min(1)) ──
const missing = template.fields
  .filter((f) => !f.hidden && f.isRequired)
  .filter((f) => {
    const v = valueFor(f)
    return v === undefined || v === null || v === ''
  })
  .map((f) => f.pdfFieldName)
if (missing.length) {
  console.error(`✗ Required fields with no value: ${missing.join(', ')}`)
  process.exit(1)
}

// ── Fill (mirrors pdf-fill.ts) ──
const pdfDoc = await PDFDocument.load(readFileSync(pdfPath))
pdfDoc.registerFontkit(fontkit)
const form = pdfDoc.getForm()
const font = await pdfDoc.embedFont(readFileSync(FONT_PATH))

let filled = 0
for (const f of template.fields) {
  if (f.hidden) continue
  const raw = valueFor(f)
  if (raw === undefined || raw === null || raw === '') continue
  try {
    if (f.type === 'checkbox') {
      const cb = form.getCheckBox(f.pdfFieldName)
      if (raw === true || raw === 'true') cb.check()
      else cb.uncheck()
    } else {
      form.getTextField(f.pdfFieldName).setText(String(raw))
    }
    filled++
  } catch (err) {
    console.warn(`  ! could not fill "${f.pdfFieldName}": ${err.message}`)
  }
}

form.updateFieldAppearances(font)
form.flatten()

// pdf-lib's flatten() deletes the widget/field objects but leaves their refs
// in each page's /Annots array — dangling refs that strict parsers (MuPDF)
// flag. Drop any ref that no longer resolves. Mirrored in src/lib/pdf-fill.ts.
for (const page of pdfDoc.getPages()) {
  const annots = page.node.Annots()
  if (!annots) continue
  const live = annots.asArray().filter((ref) => pdfDoc.context.lookup(ref) !== undefined)
  if (live.length === 0) page.node.delete(PDFName.of('Annots'))
  else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(live))
}

const out = resolve(DIST, `${id}.filled.pdf`)
// Classic xref for the same compatibility reasons as build (see author.mjs).
writeFileSync(out, await pdfDoc.save({ useObjectStreams: false }))

console.log(`✓ filled ${filled}/${template.fields.length} fields`)
console.log(`✓ wrote ${out}`)
console.log('  (open it to confirm the authored layout + values render correctly)')
