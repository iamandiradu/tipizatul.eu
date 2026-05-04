#!/usr/bin/env node
// Builds public/procedures.json by joining the eDirect procedure scrape
// (procedures.json — full structured payload per procedureId) with the bundle
// index (index.json — provides institution/county metadata per procedureId).
//
// We ship a curated subset rather than the full ~2.5k procedures (~11MB
// slimmed) — pick a handful of institutions across central + local levels so
// the bundle has enough variety to exercise the UI without bloating the SPA.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROCEDURES_PATH = path.join(__dirname, 'procedures.json')
const INDEX_PATH = path.join(__dirname, 'index.json')
const OUT_PATH = path.join(__dirname, '..', '..', 'public', 'procedures.json')

// Institutions chosen for the demo. Mix of central agencies (with downloadable
// PDF forms) and a large local primărie so the UI shows both shapes.
const TARGET_INSTITUTIONS = [
  'Ministerul Agriculturii și Dezvoltării Rurale',
  'Ministerul Justitiei',
  'Oficiul National al Registrului Comertului',
  'Oficiul Roman pentru Drepturile de Autor',
  'Autoritatea Nationala Sanitara Veterinara si pentru Siguranta Alimentelor',
  'Autoritatea Nationala de Reglementare in Domeniul Energiei',
  'Inspectoratul de Stat in Constructii - I.S.C',
  'Primaria Municipiului Constanta',
]

function slim(p, meta) {
  const institution =
    meta?.institution ||
    (p.fields?.institutiaResponsabila || '').split(',')[0].trim() ||
    'Necunoscut'
  return {
    procedureId: p.procedureId,
    title: p.title,
    institution,
    county: meta?.county ?? null,
    city: meta?.city ?? null,
    informational: !!p.informational,
    informationalNotice: p.informationalNotice ?? null,
    fields: {
      descriere: p.fields?.descriere,
      caiDeAtac: p.fields?.caiDeAtac,
      dateContact: p.fields?.dateContact,
      institutiaResponsabila: p.fields?.institutiaResponsabila,
      modalitatePrestare: p.fields?.modalitatePrestare,
      timpSolutionare: p.fields?.timpSolutionare,
      termenArhivare: p.fields?.termenArhivare,
      termenCompletareDosar: p.fields?.termenCompletareDosar,
      taxe: p.fields?.taxe,
    },
    documents: (p.documents ?? []).map((d) => ({
      nr: d.nr,
      name: d.name,
      description: d.description || '',
      required: !!d.required,
      eSignature: !!d.eSignature,
      type: d.type || '',
      downloadUrl: d.downloadUrl || null,
    })),
    outputDocuments: (p.outputDocuments ?? []).map((d) => ({
      nr: d.nr,
      name: d.name,
      type: d.type || '',
      downloadUrl: d.downloadUrl || null,
    })),
    laws: (p.laws ?? []).map((l) => ({
      nr: l.nr,
      name: l.name,
      downloadUrl: l.downloadUrl || null,
    })),
  }
}

async function main() {
  const [proceduresRaw, indexRaw] = await Promise.all([
    fs.readFile(PROCEDURES_PATH, 'utf8'),
    fs.readFile(INDEX_PATH, 'utf8'),
  ])
  const procedures = JSON.parse(proceduresRaw).procedures
  const index = JSON.parse(indexRaw).entries

  const meta = new Map()
  for (const e of index) {
    if (!e.procedureId) continue
    if (!meta.has(e.procedureId)) {
      meta.set(e.procedureId, {
        institution: e.institution,
        county: e.county,
        city: e.city,
      })
    }
  }

  const targetSet = new Set(TARGET_INSTITUTIONS)
  const out = {}
  let kept = 0
  for (const id of Object.keys(procedures)) {
    const m = meta.get(id)
    const inst =
      m?.institution ||
      (procedures[id].fields?.institutiaResponsabila || '').split(',')[0].trim()
    if (!targetSet.has(inst)) continue
    out[id] = slim(procedures[id], m)
    kept++
  }

  const payload = {
    builtAt: new Date().toISOString(),
    source: 'scripts/edirect/procedures.json + index.json',
    institutions: TARGET_INSTITUTIONS,
    total: kept,
    procedures: out,
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true })
  await fs.writeFile(OUT_PATH, JSON.stringify(payload))
  const size = (JSON.stringify(payload).length / 1024).toFixed(0)
  console.log(`Wrote ${kept} procedures across ${TARGET_INSTITUTIONS.length} institutions to ${OUT_PATH} (${size} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
