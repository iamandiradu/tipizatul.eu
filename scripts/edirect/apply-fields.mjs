#!/usr/bin/env node
/**
 * Bridge between the Python detector (paddle/detect_fields.py) and the
 * existing AcroForm writer. Reads a fields.json produced by Python, runs
 * each field's label through the Romanian pattern matcher to assign a
 * pdfFieldName + maxLength + placeholder, then hands off to acroform-writer.mjs.
 *
 * Usage:
 *   node apply-fields.mjs <input.pdf> <fields.json> <output.pdf>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { addAcroFormFields } from './lib/acroform-writer.mjs'
import { matchPattern, isSkipLabel, toFieldName } from './lib/romanian-patterns.mjs'

const [, , inputPdf, fieldsJson, outputPdf] = process.argv
if (!inputPdf || !fieldsJson || !outputPdf) {
  console.error('Usage: node apply-fields.mjs <input.pdf> <fields.json> <output.pdf>')
  process.exit(1)
}

const pdfBytes = readFileSync(inputPdf)
const payload = JSON.parse(readFileSync(fieldsJson, 'utf-8'))
const incoming = Array.isArray(payload.fields) ? payload.fields : []

const usedNames = new Set()
const labelCounts = new Map()

const enriched = incoming.map((f, idx) => {
  const label = f.label && typeof f.label === 'string' ? f.label.trim() : null
  const pattern = label ? matchPattern(label) : null
  const skip = label ? isSkipLabel(label) : false

  let baseName = label ? toFieldName(label) : ''
  if (!baseName) baseName = `${f.context || 'field'}_${idx}`

  const count = (labelCounts.get(baseName) || 0) + 1
  labelCounts.set(baseName, count)
  let pdfFieldName = count > 1 ? `${baseName}_${count}` : baseName
  while (usedNames.has(pdfFieldName)) {
    pdfFieldName = `${baseName}_${count}_p${f.page}_${idx}`
  }
  usedNames.add(pdfFieldName)

  // Penalise skip-labels (footer/page-number-like text near the field).
  const confidence = skip ? f.confidence * 0.5 : f.confidence

  return {
    pdfFieldName,
    type: f.type,
    label,
    page: f.page,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    confidence,
    context: f.context,
    fontSize: 10,
    maxLength: pattern?.maxLength ?? null,
    placeholder: pattern?.placeholder ?? null,
    isMultiline: false,
  }
})

const result = await addAcroFormFields(pdfBytes, enriched)

mkdirSync(dirname(outputPdf), { recursive: true })
writeFileSync(outputPdf, result)
console.log(`Wrote ${enriched.length} fields → ${outputPdf}`)
