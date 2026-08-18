#!/usr/bin/env node
/**
 * score-held-joins.mjs — decide whether the archetype joins held back by
 * publish-archetypes.mjs deserve to ship.
 *
 * publish-archetypes.mjs publishes only joins with text evidence. That leaves
 * 685 files (6 "candidate" + 94 "guess" unique docs) unjoined, most of them
 * asserted by an LLM classifier that said "matches archetype" without ever
 * comparing wording. Eyeballing 100 documents is not a review anyone will
 * actually do, so score them the same way the original matcher did and let the
 * numbers decide.
 *
 * Metric mirrors manifest/match_archetypes.py: diacritic-folded word uni+bigrams,
 * IDF-weighted over the compared corpus, cosine similarity. Reimplemented in JS
 * rather than shelling out to Python, so it is CALIBRATED before it is trusted:
 * the run first re-scores the 40 known-strong docs and reports whether they
 * still land high. If calibration drifts, the held-join numbers below it mean
 * nothing and the run says so.
 *
 * Usage:
 *   node scripts/edirect/manifest/score-held-joins.mjs
 *   node scripts/edirect/manifest/score-held-joins.mjs --json out.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MANIFEST = resolve(__dirname, 'manifest.json')
const REF_DIR = resolve(__dirname, '..', 'templates', 'specs', 'reference')
const TEXT_DIR = resolve(__dirname)

const args = process.argv.slice(2)
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m' }
const log = (s = '') => process.stdout.write(s + '\n')

// ── Metric (mirrors match_archetypes.py) ─────────────────────────────────────

// Fold diacritics, including BOTH the cedilla and comma-below forms of s/t —
// the scrape mixes them and treating them as different characters alone is
// enough to sink a real match.
function fold(s) {
  return s
    .replace(/[şș]/g, 's').replace(/[ŞȘ]/g, 's')
    .replace(/[ţț]/g, 't').replace(/[ŢȚ]/g, 't')
    .replace(/[ăâàá]/g, 'a').replace(/[ĂÂÀÁ]/g, 'a')
    .replace(/[îíì]/g, 'i').replace(/[ÎÍÌ]/g, 'i')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function grams(s) {
  const words = fold(s).split(' ').filter(Boolean)
  const c = new Map()
  for (let i = 0; i < words.length; i++) {
    const uni = words[i]
    c.set(uni, (c.get(uni) || 0) + 1)
    if (i + 1 < words.length) {
      const bi = `${words[i]} ${words[i + 1]}`
      c.set(bi, (c.get(bi) || 0) + 1)
    }
  }
  return c
}

function weight(vec, idf) {
  const out = new Map()
  for (const [k, v] of vec) out.set(k, v * (idf.get(k) ?? 1))
  return out
}

function norm(vec) {
  let s = 0
  for (const v of vec.values()) s += v * v
  return Math.sqrt(s)
}

function cosine(a, b, na, nb) {
  if (!na || !nb) return 0
  // Iterate the smaller map — these vectors get large on multi-page documents.
  const [small, big] = a.size < b.size ? [a, b] : [b, a]
  let dot = 0
  for (const [k, v] of small) {
    const w = big.get(k)
    if (w) dot += v * w
  }
  return dot / (na * nb)
}

// ── Load ─────────────────────────────────────────────────────────────────────

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))
const refs = new Map()
for (const f of readdirSync(REF_DIR).filter((x) => x.endsWith('.txt'))) {
  refs.set(f.replace(/\.txt$/, ''), readFileSync(resolve(REF_DIR, f), 'utf-8'))
}

function docText(d) {
  if (!d.textExtractPath) return null
  const p = resolve(TEXT_DIR, d.textExtractPath)
  return existsSync(p) ? readFileSync(p, 'utf-8') : null
}

function tierOf(c) {
  if (typeof c.matchScore === 'number') return c.matchScore >= 0.75 ? 'strong' : 'adjudicated'
  if (c.matchCandidate) return 'candidate'
  return 'guess'
}

const subjects = []
for (const d of manifest.uniqueDocs || []) {
  const c = d.classification || {}
  if (c.route !== 'R2' || !c.archetypeGuess) continue
  if (!refs.has(c.archetypeGuess)) continue
  const text = docText(d)
  if (!text) continue
  // The eDirect doc id is the `_<digits>` suffix in the filename — the same key
  // the app joins on. Never derive it from the display name.
  const docIds = []
  for (const p of d.copies || []) {
    const m = /_(\d+)\.[A-Za-z0-9()]+$/.exec(p)
    if (m) docIds.push(m[1])
  }
  subjects.push({
    cod: c.archetypeGuess,
    tier: tierOf(c),
    docIds,
    files: (d.copies || []).length,
    priorScore: typeof c.matchScore === 'number' ? c.matchScore : null,
    name: (d.copies?.[0] || '').split('/').pop() || '',
    text,
  })
}

// IDF over the compared corpus: the references plus every document we score.
const df = new Map()
const docsForIdf = [...refs.values(), ...subjects.map((s) => s.text)]
for (const t of docsForIdf) {
  for (const k of new Set(grams(t).keys())) df.set(k, (df.get(k) || 0) + 1)
}
const nDocs = docsForIdf.length
const idf = new Map()
for (const [k, v] of df) idf.set(k, Math.log(nDocs / v))

const refVec = new Map()
for (const [id, text] of refs) {
  const w = weight(grams(text), idf)
  refVec.set(id, { w, n: norm(w) })
}

for (const s of subjects) {
  const w = weight(grams(s.text), idf)
  const n = norm(w)
  const r = refVec.get(s.cod)
  s.score = cosine(w, r.w, n, r.n)
  // Also record the best-matching archetype overall: a guess that matches some
  // OTHER archetype far better is a mis-assignment, not merely a weak match.
  let best = { id: null, score: -1 }
  for (const [id, rv] of refVec) {
    const sc = cosine(w, rv.w, n, rv.n)
    if (sc > best.score) best = { id, score: sc }
  }
  s.best = best
}

// ── Calibration ──────────────────────────────────────────────────────────────

const strong = subjects.filter((s) => s.tier === 'strong')
const calMean = strong.length ? strong.reduce((a, s) => a + s.score, 0) / strong.length : 0
const calMin = strong.length ? Math.min(...strong.map((s) => s.score)) : 0

log(`${C.bold}calibration${C.reset} — re-scoring ${strong.length} known-strong docs with this implementation`)
log(`  mean ${calMean.toFixed(3)} · min ${calMin.toFixed(3)}`)
const trustworthy = strong.length > 0 && calMean >= 0.5
log(trustworthy
  ? `  ${C.green}OK${C.reset} — implementation reproduces high scores on known matches\n`
  : `  ${C.red}DRIFT${C.reset} — this metric does not reproduce the original matcher; numbers below are NOT decisive\n`)

// ── Report ───────────────────────────────────────────────────────────────────

const held = subjects.filter((s) => s.tier === 'candidate' || s.tier === 'guess')
held.sort((a, b) => b.score - a.score)

const buckets = { '>=0.75': [], '0.50-0.75': [], '0.35-0.50': [], '<0.35': [] }
for (const s of held) {
  const k = s.score >= 0.75 ? '>=0.75' : s.score >= 0.5 ? '0.50-0.75' : s.score >= 0.35 ? '0.35-0.50' : '<0.35'
  buckets[k].push(s)
}

log(`${C.bold}held-back joins${C.reset} — ${held.length} unique docs, ${held.reduce((a, s) => a + s.files, 0)} files`)
for (const [k, v] of Object.entries(buckets)) {
  log(`  ${k.padEnd(10)} ${String(v.length).padStart(3)} docs  ${String(v.reduce((a, s) => a + s.files, 0)).padStart(4)} files`)
}

const misassigned = held.filter((s) => s.best.id && s.best.id !== s.cod && s.best.score > s.score + 0.05)
log(`\n${C.yellow}mis-assigned${C.reset}: ${misassigned.length} docs score higher against a DIFFERENT archetype than the one guessed`)

log(`\n${C.bold}top 12 held joins by score${C.reset}`)
for (const s of held.slice(0, 12)) {
  const flag = s.best.id !== s.cod ? ` ${C.yellow}(best: ${s.best.id} ${s.best.score.toFixed(2)})${C.reset}` : ''
  log(`  ${s.score.toFixed(3)}  ${String(s.files).padStart(3)}f  ${s.cod.padEnd(30)} ${s.name.slice(0, 40)}${flag}`)
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(
    held.map(({ text, ...rest }) => rest), null, 1), 'utf-8')
  log(`\nwrote ${jsonOut}`)
}

// ── Promotion list ───────────────────────────────────────────────────────────

// 0.35 is not a new bar: it is the floor of the adjudicated tier already
// published, so promoting at the same threshold keeps one standard. A doc that
// matches some other archetype better is excluded regardless of score — that is
// a mis-assignment, and publishing it would put a citizen on the wrong form.
const PROMOTE_MIN = 0.35
const promoteArg = args.includes('--promote') ? args[args.indexOf('--promote') + 1] : null
if (promoteArg) {
  if (!trustworthy) {
    log(`${C.red}refusing to emit a promotion list: calibration drifted${C.reset}`)
    process.exit(1)
  }
  const promoted = held.filter((s) => s.score >= PROMOTE_MIN && s.best.id === s.cod)
  const byArchetype = {}
  let files = 0
  for (const s of promoted) {
    ;(byArchetype[s.cod] ??= { docIds: [], files: 0, scores: [] })
    byArchetype[s.cod].docIds.push(...s.docIds)
    byArchetype[s.cod].files += s.files
    byArchetype[s.cod].scores.push(Number(s.score.toFixed(3)))
    files += s.files
  }
  writeFileSync(promoteArg, JSON.stringify({
    generatedAt: null,
    threshold: PROMOTE_MIN,
    calibration: { mean: Number(calMean.toFixed(3)), min: Number(calMin.toFixed(3)) },
    note: 'Emitted by score-held-joins.mjs. Only docs scoring >= threshold against '
      + 'the archetype they were guessed as, and not matching another archetype better.',
    archetypes: byArchetype,
  }, null, 1), 'utf-8')
  log(`\n${C.green}promotion list${C.reset}: ${promoted.length} docs, ${files} files → ${promoteArg}`)
  for (const [id, v] of Object.entries(byArchetype)) {
    log(`  ${id.padEnd(30)} ${String(v.docIds.length).padStart(3)} docIds  ${String(v.files).padStart(3)} files  scores ${v.scores.join(', ')}`)
  }
  const rejected = held.length - promoted.length
  log(`${C.dim}  held back: ${rejected} docs — below ${PROMOTE_MIN} or better-matched elsewhere${C.reset}`)
}
