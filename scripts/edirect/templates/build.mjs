#!/usr/bin/env node
/**
 * Build authored archetypes into PDF + Template JSON pairs under dist/.
 *
 * Usage:
 *   node build.mjs <archetype-id> [--institution "Name"] [--logo path] [--address "..."]
 *   node build.mjs cerere-tip
 *   node build.mjs cerere-tip --institution "Primăria Comunei Exemplu" --address "Str. Exemplu nr. 1"
 *   node build.mjs --all              # every spec, generic instance
 *   node build.mjs --all dasm-cj-     # every spec whose id starts with the prefix
 *
 * Output:
 *   dist/<id>.pdf            fillable AcroForm PDF (inputs in place)
 *   dist/<id>.template.json  the Template the app's fill pipeline consumes
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
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

const argv = process.argv.slice(2)
const all = argv.includes('--all')
const { id, instance } = parseArgs(argv.filter((a) => a !== '--all'))

if (!all && !id) {
  console.error('Usage: node build.mjs <archetype-id> [--institution "Name"] [--logo path] [--address "..."]')
  console.error('       node build.mjs --all [id-prefix]')
  process.exit(1)
}

// Batch mode: a family of replicas is authored and rebuilt together (36+ specs
// now), and one build per shell invocation does not scale.
const ids = all
  ? readdirSync(SPECS)
      .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
      .map((f) => f.replace(/\.mjs$/, ''))
      .filter((s) => !id || s.startsWith(id))
      .sort()
  : [id]

if (all && ids.length === 0) {
  console.error(`No specs match prefix "${id}"`)
  process.exit(1)
}

mkdirSync(DIST, { recursive: true })

for (const specId of ids) {
  const specPath = resolve(SPECS, `${specId}.mjs`)
  if (!existsSync(specPath)) {
    console.error(`No spec found at specs/${specId}.mjs`)
    process.exit(1)
  }

  const { spec } = await import(pathToFileURL(specPath).href)
  const { pdfBytes, template } = await buildArchetype(spec, all ? {} : instance)

  const stem = template.id
  writeFileSync(resolve(DIST, `${stem}.pdf`), pdfBytes)
  writeFileSync(resolve(DIST, `${stem}.template.json`), JSON.stringify(template, null, 2))

  console.log(`✓ ${stem}.pdf  (${template.fields.length} fields, ${pdfBytes.length} bytes)`)
  if (all) continue
  console.log(`✓ ${stem}.template.json`)
  for (const f of template.fields) {
    console.log(`   · ${f.pdfFieldName.padEnd(20)} ${f.type}${f.isRequired ? ' *' : ''}  "${f.label}"`)
  }
}
