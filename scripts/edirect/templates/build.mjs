#!/usr/bin/env node
/**
 * Build authored archetypes into PDF + Template JSON pairs under dist/.
 *
 * Usage:
 *   node build.mjs <archetype-id> [--institution "Name"] [--logo path] [--address "..."]
 *   node build.mjs cerere-tip
 *   node build.mjs cerere-tip --institution "Primăria Comunei Exemplu" --address "Str. Exemplu nr. 1"
 *
 * Output:
 *   dist/<id>.pdf            fillable AcroForm PDF (inputs in place)
 *   dist/<id>.template.json  the Template the app's fill pipeline consumes
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

import { buildArchetype } from './lib/author.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(HERE, 'dist')
const SPECS = resolve(HERE, 'specs')

function parseArgs(argv) {
  const [id, ...rest] = argv
  const opts = {}
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--institution') opts.institutionName = rest[++i]
    else if (a === '--logo') opts.logoPath = rest[++i]
    else if (a === '--address') opts.addressLine = rest[++i]
  }
  return { id, instance: opts }
}

const { id, instance } = parseArgs(process.argv.slice(2))
if (!id) {
  console.error('Usage: node build.mjs <archetype-id> [--institution "Name"] [--logo path] [--address "..."]')
  process.exit(1)
}

const specPath = resolve(SPECS, `${id}.mjs`)
if (!existsSync(specPath)) {
  console.error(`No spec found at specs/${id}.mjs`)
  process.exit(1)
}

const { spec } = await import(pathToFileURL(specPath).href)
const { pdfBytes, template } = await buildArchetype(spec, instance)

mkdirSync(DIST, { recursive: true })
const stem = template.id
writeFileSync(resolve(DIST, `${stem}.pdf`), pdfBytes)
writeFileSync(resolve(DIST, `${stem}.template.json`), JSON.stringify(template, null, 2))

console.log(`✓ ${stem}.pdf  (${template.fields.length} fields, ${pdfBytes.length} bytes)`)
console.log(`✓ ${stem}.template.json`)
for (const f of template.fields) {
  console.log(`   · ${f.pdfFieldName.padEnd(20)} ${f.type}${f.isRequired ? ' *' : ''}  "${f.label}"`)
}
