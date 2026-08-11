#!/usr/bin/env node
/**
 * Editability round-trip guard. For EVERY spec in specs/ (generic instance):
 *
 *   1. build in-memory via buildArchetype
 *   2. re-open the blank PDF and assert, per template field:
 *      - the field exists and its PDF class matches the declared type
 *      - the PDF Required flag mirrors Template.isRequired
 *      - text-field /DA references the embedded NotoSans (diacritics survive
 *        direct editing in Acrobat/Chrome — the Path-B fix)
 *   3. assert the PDF holds no fields the Template doesn't know about
 *   4. fill every text field with diacritics (ș ț ă â î), check every
 *      checkbox, updateFieldAppearances + flatten + save (the app's fill path)
 *
 * Exits non-zero on the first failing archetype. Run after any author.mjs
 * change:  node test-editability.mjs
 */

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

import { PDFDocument, PDFName, PDFTextField, PDFCheckBox } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

import { buildArchetype } from './lib/author.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SPECS = resolve(HERE, 'specs')
const FONT_PATH = resolve(HERE, '../../../public/fonts/NotoSans-Regular.ttf')
const DIACRITICS_SAMPLE = 'Țînără șansă ăâî — ȘȚĂÂÎ 0123456789'

const ids = readdirSync(SPECS)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .map((f) => f.replace(/\.mjs$/, ''))
  .sort()

const fontBytes = readFileSync(FONT_PATH)
let failures = 0

for (const id of ids) {
  const problems = []
  const { spec } = await import(pathToFileURL(resolve(SPECS, `${id}.mjs`)).href)
  const { pdfBytes, template } = await buildArchetype(spec)

  const doc = await PDFDocument.load(pdfBytes)
  const form = doc.getForm()
  const pdfFields = new Map(form.getFields().map((f) => [f.getName(), f]))

  // 2. Template ↔ PDF agreement, DA font, Required flag.
  for (const tf of template.fields) {
    const pf = pdfFields.get(tf.pdfFieldName)
    if (!pf) {
      problems.push(`missing in PDF: ${tf.pdfFieldName}`)
      continue
    }
    const wantClass = tf.type === 'checkbox' ? PDFCheckBox : PDFTextField
    if (!(pf instanceof wantClass)) {
      problems.push(`${tf.pdfFieldName}: PDF class ${pf.constructor.name}, template says ${tf.type}`)
    }
    if (pf.isRequired() !== tf.isRequired) {
      problems.push(`${tf.pdfFieldName}: PDF required=${pf.isRequired()}, template says ${tf.isRequired}`)
    }
    if (pf instanceof PDFTextField) {
      const da = pf.acroField.getDefaultAppearance() ?? ''
      if (!da.includes('/NotoSans')) {
        problems.push(`${tf.pdfFieldName}: /DA is "${da}" (no /NotoSans)`)
      }
    }
  }

  // 3. No orphan PDF fields.
  const known = new Set(template.fields.map((f) => f.pdfFieldName))
  for (const name of pdfFields.keys()) {
    if (!known.has(name)) problems.push(`orphan PDF field not in template: ${name}`)
  }

  // 4. Diacritics fill + flatten round-trip (mirrors src/lib/pdf-fill.ts).
  try {
    doc.registerFontkit(fontkit)
    const font = await doc.embedFont(fontBytes)
    for (const pf of form.getFields()) {
      if (pf instanceof PDFTextField) pf.setText(DIACRITICS_SAMPLE.slice(0, pf.acroField.getMaxLength() ?? undefined))
      else if (pf instanceof PDFCheckBox) pf.check()
    }
    form.updateFieldAppearances(font)
    form.flatten()
    // Scrub the dangling /Annots refs flatten leaves behind (see verify-fill).
    for (const page of doc.getPages()) {
      const annots = page.node.Annots()
      if (!annots) continue
      const live = annots.asArray().filter((ref) => doc.context.lookup(ref) !== undefined)
      if (live.length === 0) page.node.delete(PDFName.of('Annots'))
      else page.node.set(PDFName.of('Annots'), doc.context.obj(live))
    }
    const flatBytes = await doc.save({ useObjectStreams: false })
    // Assert the flattened output holds NO dangling references at all.
    const reopened = await PDFDocument.load(flatBytes)
    if (reopened.getForm().getFields().length !== 0) {
      problems.push('flattened PDF still exposes form fields')
    }
    for (const page of reopened.getPages()) {
      const annots = page.node.Annots()
      if (annots && annots.asArray().some((ref) => reopened.context.lookup(ref) === undefined)) {
        problems.push('flattened PDF has dangling /Annots refs')
      }
    }
  } catch (err) {
    problems.push(`fill/flatten round-trip failed: ${err.message}`)
  }

  if (problems.length) {
    failures++
    console.error(`✗ ${id}`)
    for (const p of problems) console.error(`    ${p}`)
  } else {
    const req = template.fields.filter((f) => f.isRequired).length
    const val = template.fields.filter((f) => f.validation).length
    console.log(`✓ ${id}  (${template.fields.length} fields, ${req} required, ${val} validated)`)
  }
}

if (failures) {
  console.error(`\n${failures}/${ids.length} archetypes failed`)
  process.exit(1)
}
console.log(`\nAll ${ids.length} archetypes pass.`)
