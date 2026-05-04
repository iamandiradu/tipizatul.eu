#!/usr/bin/env node
// Builds public/procedures.json by joining the eDirect procedure scrape
// (procedures.json — full structured payload per procedureId) with the bundle
// index (index.json — provides institution/county metadata per procedureId).
//
// Scope: every procedure we have at least one uploaded form for. We derive
// the procedure set from upload-templates-progress.json (each entry's stem
// ends in `_<eDirectDocId>`, mapped via index.json to its procedureId), so
// the bundle naturally tracks the catalog. Procedures we haven't scraped
// yet are skipped — they reappear once fetch-procedures.mjs catches up.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROCEDURES_PATH = path.join(__dirname, 'procedures.json')
const INDEX_PATH = path.join(__dirname, 'index.json')
const PROGRESS_PATH = path.join(__dirname, 'upload-templates-progress.json')
const OUT_PATH = path.join(__dirname, '..', '..', 'public', 'procedures.json')

// Normalize the URL the same way both sides do — trim, strip trailing slashes,
// percent-decode where it's safe — so an index.json entry matches a
// procedure-detail document URL even if one of them is decoded and the other
// isn't. eDirect rewrites whitespace inconsistently between the two scrapes.
function normalizeUrl(u) {
  if (!u) return ''
  let s = String(u).trim()
  try {
    s = decodeURI(s)
  } catch {
    /* ignore — keep encoded form */
  }
  return s
}

function slim(p, meta, urlToDocId) {
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
    documents: (p.documents ?? []).map((d) => {
      const eDirectDocId = d.downloadUrl
        ? urlToDocId.get(normalizeUrl(d.downloadUrl)) ?? null
        : null
      return {
        nr: d.nr,
        name: d.name,
        description: d.description || '',
        required: !!d.required,
        eSignature: !!d.eSignature,
        type: d.type || '',
        downloadUrl: d.downloadUrl || null,
        ...(eDirectDocId ? { eDirectDocId } : {}),
      }
    }),
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

// Pulls the trailing `_<digits>` off a bundle stem — same key used to label
// the upload, so progress entries always carry one.
function eDirectDocIdFromStem(stem) {
  const m = /_(\d+)$/.exec(stem)
  return m ? m[1] : null
}

async function main() {
  const [proceduresRaw, indexRaw, progressRaw] = await Promise.all([
    fs.readFile(PROCEDURES_PATH, 'utf8'),
    fs.readFile(INDEX_PATH, 'utf8'),
    fs.readFile(PROGRESS_PATH, 'utf8'),
  ])
  const procedures = JSON.parse(proceduresRaw).procedures
  const index = JSON.parse(indexRaw).entries
  const progress = JSON.parse(progressRaw)

  // doc-id → procedureId via index.json. Also collects per-procedureId meta
  // (institution, county) for the join, plus url → doc-id so the per-document
  // eDirectDocId tag survives into the slim payload.
  const meta = new Map()
  const urlToDocId = new Map()
  const docIdToProcedureId = new Map()
  for (const e of index) {
    if (e.procedureId && !meta.has(e.procedureId)) {
      meta.set(e.procedureId, {
        institution: e.institution,
        county: e.county,
        city: e.city,
      })
    }
    if (e.id && e.procedureId) {
      docIdToProcedureId.set(String(e.id), String(e.procedureId))
    }
    if (e.id && e.downloadUrl) {
      const k = normalizeUrl(e.downloadUrl)
      if (!urlToDocId.has(k)) urlToDocId.set(k, String(e.id))
    }
  }

  // The set of procedures we've uploaded forms for — that's what the catalog
  // can plausibly link to from a /procedura/:id page. Skipping the rest keeps
  // the bundle from listing procedures with zero editable forms.
  const procIds = new Set()
  let coveredEntries = 0
  for (const key of Object.keys(progress.uploaded || {})) {
    const stem = key.includes('/') ? key.slice(key.indexOf('/') + 1) : key
    const docId = eDirectDocIdFromStem(stem)
    if (!docId) continue
    const pid = docIdToProcedureId.get(docId)
    if (!pid) continue
    coveredEntries++
    procIds.add(pid)
  }

  const out = {}
  let kept = 0
  let missingScrape = 0
  for (const id of procIds) {
    const p = procedures[id]
    if (!p) {
      missingScrape++
      continue
    }
    out[id] = slim(p, meta.get(id), urlToDocId)
    kept++
  }

  const payload = {
    builtAt: new Date().toISOString(),
    source: 'scripts/edirect/procedures.json + index.json + upload-templates-progress.json',
    total: kept,
    procedures: out,
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true })
  const json = JSON.stringify(payload)
  await fs.writeFile(OUT_PATH, json)
  const size = (json.length / 1024).toFixed(0)
  console.log(
    `Wrote ${kept} procedures (${(size / 1024).toFixed(1)} MB raw)` +
      ` from ${procIds.size} unique procedureIds touched by ${coveredEntries} uploaded forms.` +
      (missingScrape > 0
        ? ` Skipped ${missingScrape} procedures not yet in procedures.json (re-run after the next fetch-procedures batch).`
        : ''),
  )
  console.log(`Output: ${OUT_PATH} (${size} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
