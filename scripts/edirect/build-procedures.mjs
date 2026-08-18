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
//
// Not every institution publishes on eDirect. Those that don't are scraped
// directly into scripts/sources/<id>/procedures.json, already in this shape,
// and merged in here (SOURCE_PATHS) so the app has one bundle to read.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROCEDURES_PATH = path.join(__dirname, 'procedures.json')
// Sources that don't publish on eDirect and are scraped directly. Each writes
// an already-slim, Procedure-shaped payload (see scripts/sources/<id>/fetch.mjs),
// so they merge in as-is rather than going through slim() — there is no
// index.json to join them against, and their documents carry their own ids.
const SOURCE_PATHS = [path.join(__dirname, '..', 'sources', 'dasm-cluj', 'procedures.json')]
const INDEX_PATH = path.join(__dirname, 'index.json')
const PROGRESS_PATH = path.join(__dirname, 'upload-templates-progress.json')
const MIRROR_PROGRESS_PATH = path.join(__dirname, 'mirror-progress.json')
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

function slim(p, meta, urlToDocId, mirrored) {
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
      // Our own copy of the file, when mirror-documents.mjs has uploaded one.
      // Keyed by the same doc id, so a document that never resolved an
      // eDirectDocId simply keeps hotlinking eDirect.
      const m = eDirectDocId ? mirrored.get(eDirectDocId) : null
      return {
        nr: d.nr,
        name: d.name,
        description: d.description || '',
        required: !!d.required,
        eSignature: !!d.eSignature,
        type: d.type || '',
        downloadUrl: d.downloadUrl || null,
        ...(eDirectDocId ? { eDirectDocId } : {}),
        ...(m
          ? {
              mirrorFileId: m.driveFileId,
              mirrorExt: m.ext,
              mirrorMimeType: m.mimeType,
              mirrorBytes: m.bytes,
            }
          : {}),
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

  // Optional: absent until mirror-documents.mjs has run at least once. The
  // bundle is still valid without it — documents just keep pointing at eDirect.
  const mirrored = new Map()
  try {
    const raw = await fs.readFile(MIRROR_PROGRESS_PATH, 'utf8')
    for (const [docId, m] of Object.entries(JSON.parse(raw).mirrored || {})) {
      if (m?.driveFileId) mirrored.set(String(docId), m)
    }
  } catch {
    /* no mirror yet — fall through with an empty map */
  }

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
    out[id] = slim(p, meta.get(id), urlToDocId, mirrored)
    kept++
  }

  // Non-eDirect sources. They are additive: their procedureIds are namespaced
  // (`dasm-cj-…`), so they cannot collide with eDirect's numeric ids, and a
  // missing source file is not an error — the bundle is still valid without it.
  let sourceProcedures = 0
  for (const sourcePath of SOURCE_PATHS) {
    let raw
    try {
      raw = await fs.readFile(sourcePath, 'utf8')
    } catch {
      console.warn(`Skipping ${path.relative(process.cwd(), sourcePath)} — not scraped yet.`)
      continue
    }
    const payload = JSON.parse(raw)
    for (const [id, p] of Object.entries(payload.procedures ?? {})) {
      if (out[id]) {
        console.warn(`Skipping duplicate procedureId ${id} from ${payload.source}`)
        continue
      }
      out[id] = p
      sourceProcedures++
      kept++
    }
  }

  // Mirror coverage over what the bundle actually surfaces — the number that
  // matters is "downloads that survive eDirect going away", not raw upload count.
  let linkedDocs = 0
  let mirroredDocs = 0
  for (const p of Object.values(out)) {
    for (const d of p.documents) {
      if (!d.downloadUrl) continue
      linkedDocs++
      if (d.mirrorFileId) mirroredDocs++
    }
  }

  const payload = {
    builtAt: new Date().toISOString(),
    source:
      'scripts/edirect/procedures.json + index.json + upload-templates-progress.json' +
      (sourceProcedures > 0 ? ' + scripts/sources/*/procedures.json' : ''),
    total: kept,
    procedures: out,
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true })
  const json = JSON.stringify(payload)
  await fs.writeFile(OUT_PATH, json)
  const size = (json.length / 1024).toFixed(0)
  console.log(
    `Wrote ${kept} procedures` +
      (sourceProcedures > 0 ? ` (${sourceProcedures} from non-eDirect sources)` : '') +
      ` (${(size / 1024).toFixed(1)} MB raw)` +
      ` from ${procIds.size} unique procedureIds touched by ${coveredEntries} uploaded forms.` +
      (missingScrape > 0
        ? ` Skipped ${missingScrape} procedures not yet in procedures.json (re-run after the next fetch-procedures batch).`
        : ''),
  )
  console.log(`Output: ${OUT_PATH} (${size} KB)`)
  const pct = linkedDocs ? ((mirroredDocs / linkedDocs) * 100).toFixed(1) : '0.0'
  console.log(
    `Mirror coverage: ${mirroredDocs}/${linkedDocs} downloadable documents (${pct}%)` +
      (mirroredDocs < linkedDocs
        ? ` — the rest still hotlink eDirect; run mirror-documents.mjs to close the gap.`
        : ''),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
