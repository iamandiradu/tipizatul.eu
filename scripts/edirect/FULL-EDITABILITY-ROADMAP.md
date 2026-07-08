# Full-Editability Roadmap — every catalog document fillable in the browser as AcroForm

_Written 2026-07-02 as a handoff for a future model session (target reader: Claude
Opus or newer). It assumes ZERO memory of prior sessions. Read this document fully
before doing anything. Numbers marked **[measured]** were computed on this machine
on 2026-07-02 and are reproducible with the commands in Appendix D._

---

## 0. Read-first order

1. This file, fully.
2. `scripts/edirect/templates/STATUS.md` — the authored-templates system handoff.
3. `scripts/edirect/templates/COVERAGE-SAMPLE.md` — the sampling that shaped this strategy.
4. `scripts/edirect/templates/TOP-20-ARCHETYPES.md` — what is already authored and why.
5. `ARCHITECUTRAL_PLAN.md` (repo root, typo in filename is real) — the app architecture.
6. `src/types/template.ts` — the Template JSON contract. Everything must conform to it.

Project memory (`~/.claude/projects/.../memory/`) has pointers but this document
supersedes it for this initiative.

### 0.1 DO-NOT list (hard constraints for the next model)

- Do NOT publish anything to Firestore/Drive without Radu present — it is
  outward-facing and needs his admin auth. Prepare everything; he pulls the trigger.
- Do NOT commit `api/pdf.ts` — it carries Radu's own uncommitted change
  (debug-log removal). Leave it alone unless he asks.
- Do NOT modify `lib/author.mjs` without running `node test-editability.mjs`
  afterward — it is the only regression gate for 22+ specs.
- Do NOT re-measure the §2 census unless the corpus changed — it takes minutes
  and the numbers here are the baseline.
- Do NOT trust filenames for identity (use md5) or institution names for joins
  (use the directory string / eDirectDocId).
- Do NOT let synthetic fill data contain real-looking CNPs in anything committed.
- Do NOT set `NeedAppearances` or revert to object-stream xref — both decisions
  were made deliberately (§7.2) after testing.

---

## 1. Mission and Definition of Done

**Goal:** every form document in the eDirect catalog is fillable in the browser
at tipizatul.eu — the user opens `/fill/:id`, gets a react-hook-form generated
from Template JSON, and downloads a flattened, diacritics-correct PDF.

A document counts as **DONE** when ALL of the following hold:

1. A fillable **AcroForm PDF** exists on Google Drive (public-readable) and its
   `driveFileId` is set on a **Firestore `templates/{id}`** document.
2. The Template JSON conforms to `src/types/template.ts` (`fields[]` with
   `pdfFieldName`, `type`, `label`, `isRequired`, optional
   `validation`/`maxLength`/`group`/`hint`/`placeholder`).
3. The PDF passes the **editability checklist** (§8.1): NotoSans in `/DR` + per-field
   `/DA`, Required flags mirroring the JSON, classic xref, fill→flatten round-trip
   with zero dangling refs, diacritics render (ă â î ș ț both cases).
4. `acroFormOrigin` is set honestly: `'original'` (source already had the AcroForm),
   `'generated'` (we authored or detected it). Authored archetypes additionally carry
   the informal `archetype: <spec-id>` marker.
5. The catalog index is rebuilt (`npm run catalog:rebuild`) so the form is
   discoverable and in the sitemap.
6. **Not every file becomes a form.** Non-form documents (methodologies, orders,
   informational annexes) are explicitly **excluded** with a recorded reason —
   exclusion with reason is also "done". The mission is "everything editable OR
   consciously excluded", not "everything has input boxes".

---

## 2. The corpus — hard numbers **[measured]**

Source: `scripts/edirect/downloads/` — 732 institution directories scraped from
eDirect. File name pattern: `<Name>_<eDirectDocId>.<ext>`.

| Metric | Value |
|---|---:|
| Total files | 8,403 |
| **Unique documents (md5)** | **3,860** |
| Redundant byte-identical copies | 4,543 (54%) |
| PDF / DOCX / DOC | 3,203 / 2,744 / 2,251 |
| XLSX / RTF / images | 118 / 72 / 15 |
| Unique PDFs | 1,538 |
| — already have AcroForm | 133 |
| — text layer, no AcroForm | 881 |
| — scanned (no/near-no text layer) | 524 |
| Unique DOC+DOCX (estimate: unique − uniquePDF − misc) | ~2,150–2,250 |

**The single most important fact:** deduplication cuts the problem by more than
half, and the biggest duplicate groups map 1:1 onto already-authored archetypes:

| Copies | File (one representative) | Covered by |
|---:|---|---|
| 130× | `Cerere tip solicitant_*.docx` (DSP Modelul nr. 3) | `cerere-dsp-model-3` ✅ |
| 125× | `Declaratie-consimtamant_*.pdf` | `declaratie-consimtamant` ✅ |
| 125× | `Cerere tip catre DSP_*.docx` (DSP Modelul nr. 2) | `cerere-dsp-model-2` ✅ |
| 98× | `Cerere tip_3092.doc` (IGPF border-zone aviz) | needs spec (§6 P3) |
| 92× | `Tabel nominal cu autovehiculele_*.doc` | `tabel-nominal-auto` ✅ |
| 87× | `Tabel nominal cu persoanele_*.doc` | `tabel-nominal-persoane` ✅ |
| 70× | `Înscrierea la licee_*.docx` (education cluster) | likely EXCLUDE (informational) |
| 42× | `Declaratie GDPR_*.docx` | `declaratie-gdpr` ✅ |
| 41× | `Acordul pentru prelucrarea datelor_*.doc` | `acord-prelucrare-date` ✅ |

The education ministry cluster (~35 copies × dozens of documents, one per county
school inspectorate) is mostly *methodologies and regulations*, not forms — route
most of it to EXCLUDE (§5, R7).

### 2.0b Re-census 2026-07-08 **[measured]** — supersedes the file counts above

The Phase 0 manifest build found the 2026-07-02 census undercounted: Python's
default directory walk silently skips files whose full path exceeds Windows
MAX_PATH (260 chars). With the `\\?\` extended-length prefix the true corpus is
**8,477 files / 3,905 unique docs** (was 8,403/3,860): +74 files, +45 uniques,
+37 unique PDFs (1,575 total; 134 with AcroForm). 787 corpus files sit on
>250-char paths — any future corpus tooling MUST use the extended-length
prefix (see `manifest/build_manifest.py`). The §2 table stays as the
2026-07-02 baseline per the footer rule.

### 2.1 Coverage sampling result (from COVERAGE-SAMPLE.md)

50 random files from the "cerere tip" cluster, classified manually:
~5% covered by the generic `cerere-tip` as-is; **~59% need the
legal-representative variant** (now built: `representativeBlock`); most of those
are **verbatim national annex models** (byte- or text-identical across counties);
~9% genuinely structured domain forms; ~14% belong to other archetypes; 12% of
the sample was scanned. **Implication: replica-author the national models first —
exact fidelity, massive fan-out.**

---

## 3. What already exists (do not rebuild these)

### 3.1 The authored-templates system — `scripts/edirect/templates/`
Committed as `5ca950c`. 22 archetype specs, all passing verification.

- `lib/author.mjs` — declarative `ArchetypeSpec` → `{ pdfBytes, template }`.
  Primitives: `paragraph`, `labeledField`, `twoColFields`, `multilineField`,
  `checkbox` (with `indent` for nesting), `table` (repeating rows, auto-numbered
  Nr. crt., header re-drawn after page breaks), `signatureFooter`,
  `addressee(opts)` (the institution slot). Page-break aware via `ctx.ensureSpace`.
  Editability plumbing: `registerAcroFormFont` (NotoSans → AcroForm `/DR`),
  `finalizeTextField` (per-field `/DA` + Required flag), `VALIDATION_BY_PATTERN`
  (CNP/date/email/phone/IBAN regex → Template JSON `validation`), classic-xref save.
- `specs/_shared.mjs` — `identityBlock` (citizen; opts `email`, `actIdentitate`),
  `declarantBlock` (declarations), `representativeBlock` (legal-representative/
  business applicant), `partyBlock` (prefixed, for two-party docs).
- `specs/*.mjs` — 22 archetypes: cerere family (6), declarations (4), national-model
  replicas (`cerere-dsp-model-2/-3`, `cerere-atestare-fiscala` = ITL 010), tables (2),
  two-party (`imputernicire`, `contract-comodat`), legal-text (`cerere-544`,
  `petitie`, `cerere-alocatie-copii`, `cerere-concediu-crestere`, `cerere-cazier`).
- `build.mjs` — CLI. `--institution "X" --address "Y" --logo p.png` bakes an
  institution instance (template id becomes `<spec-id>-<slug>`); omitting it emits
  the generic build where the institution is an editable required field.
- `verify-fill.mjs` — mirrors `src/lib/pdf-fill.ts` in Node; emits `dist/<id>.filled.pdf`.
- `test-editability.mjs` — THE regression gate. Asserts per archetype: every
  Template field exists in the PDF with the right class; Required flags match;
  text-field `/DA` references `/NotoSans`; no orphan PDF fields; diacritics fill →
  `updateFieldAppearances` → `flatten` → reopen with **zero dangling refs**.
  Run after ANY `author.mjs` change: `node test-editability.mjs`.

### 3.2 The detection pipeline (for documents that resist authoring)
- `lib/acroform-writer.mjs` — overlays transparent AcroForm fields at coordinates.
- `lib/romanian-patterns.mjs` — label → field-name/maxLength/placeholder matcher;
  `toFieldName()` transliteration. The authored system reuses this — keep them in sync.
- `lib/field-detector.mjs`, `lib/label-associator.mjs`, `lib/content-stream-parser.mjs`.
- `paddle/detect_fields.py` — PaddleOCR-based visual field detection (+ `evaluate.py`).
- `llm/` — LLM-driven detection: `detect.py`, `corpus_batch.py` (batch runner with
  queue/progress files), `chat_apply.py`, `scan_acroform.py` (AcroForm presence scan),
  `extract_digital.py`. See `llm/README.md` and `llm/RESUME-NOTES.md`.
- `apply-fields.mjs` — bridges Python detections → `acroform-writer.mjs`.
- `convert-docs.mjs` — DOC/DOCX → PDF via LibreOffice (`soffice.exe` is at
  `C:\Program Files\LibreOffice\program\soffice.exe` on this machine).

### 3.3 The app (src/) and publishing surface
- Fill: `src/lib/pdf-fill.ts` (NotoSans embed, fill, flatten, **/Annots scrub** —
  commit `22da35c`), `schema-builder.ts` (Template JSON → Zod), `FillPage.tsx`.
- Signatures: `signature.ts` + overlay components; any text field whose label
  matches `/semn[aă]tur/i` becomes a signature slot (draw/upload, drag, resize).
- Storage: PDFs on Google Drive (public folder), metadata in Firestore
  (`templates/{id}`, aggregate `catalog/index` via `build-catalog-index.mjs`,
  `procedures/{id}` via `build-procedures.mjs`), sitemap via `build-sitemap.mjs`.
- Admin: `/admin` (Google OAuth + Firestore allowlist) uploads PDFs, annotates
  fields, saves templates. Bulk paths exist as scripts (see
  `upload-templates-progress.json`, `upload-originals-progress.json` in gitignore —
  the corresponding upload scripts ran before; check `git log --all --oneline --
  scripts/edirect` for their history if needed).
- Joins: `Template.eDirectDocId` ← the numeric id in the filename stem; ties a
  template to `procedure.documents[]` so procedure pages link "Completează online".

---

## 4. Architecture invariants — violate none of these

1. **User data never leaves the browser.** All filling is client-side. Nothing in
   this roadmap may introduce server-side processing of filled values.
2. **The PDF carries layout; the Template JSON carries semantics.** No coordinates
   in JSON, ever.
3. **Field naming:** snake_case ASCII via `toFieldName()`; shared concepts use the
   canonical names (`nume_si_prenume`, `cnp`, `telefon`, `email`, `adresa`,
   `localitate`, `judet`, `data`, `semnatura`, `institutie`). Prefixes for
   multi-party (`mandant_*`, `comodatar_*`) and tables (`persoana_r3_cnp`).
4. **Institution placement rule (Radu's, explicit):** for a cerere the institution
   is the ADDRESSEE — `Către,` block in the first rows — never letterhead. It is
   REQUIRED: either baked (stamped instance) or an editable required field.
5. **Trust labeling:** `acroFormOrigin: 'original' | 'generated'` must stay honest.
   The "completabil online" public promise currently keys off this.
6. **Every authored/generated PDF must pass the §8.1 checklist** — enforced by
   `test-editability.mjs` for archetypes; the detection route needs the same gate
   (build it in Phase 4).
7. Windows environment: Node 24 (dynamic `import()` needs `pathToFileURL`), Python
   3.14 + PyMuPDF (`PYTHONIOENCODING=utf-8` REQUIRED or prints crash), LibreOffice
   for DOC conversion, `dist/` under templates/ is gitignored by the root `dist/` rule.

---

## 5. The routing model

Every unique document gets exactly ONE route. The routes, in priority order
(first match wins):

| Route | Name | Criteria | Output |
|---|---|---|---|
| **R0** | Already fillable | Unique PDF with a working AcroForm (133 candidates) | Verify (§8.2), generate Template JSON from the existing fields via the same introspection the admin UI uses (`src/lib/pdf-introspect.ts` — reads field names/types/options from the PDF), publish with `acroFormOrigin:'original'` |
| **R1** | Duplicate | md5 identical to a routed document | Alias: same `driveFileId`, own `eDirectDocId` join (or one shared template — see §7.10) |
| **R2** | Archetype instance | Text matches a built archetype (≥ threshold, §6 P2) | Stamped or generic instance of the spec |
| **R3** | National model replica | Same normalized text appears across ≥3 institutions but no spec yet | Author a new replica spec (the DSP-model playbook) |
| **R4** | One-off authorable | Simple linear form (subsemnat → fields → semnătură), single institution | Author a one-off spec OR extend an archetype with options |
| **R5** | Detection overlay | Text-layer PDF too complex/structured to author economically | paddle/llm detection → `apply-fields.mjs` → editability gate |
| **R6** | Scan | No text layer (524 unique PDFs) | OCR-assisted detection (paddle) or EXCLUDE if low value |
| **R7** | Excluded | Not a form: methodology, order, regulation, informational annex, output document (certificates the INSTITUTION issues), image, xlsx data table | Record reason; surface as download-only |

Routing heuristics (Phase 1 builds the classifier):
- "Not a form" signals: no blank runs (`....`, `___`, `……`) in text, no
  `subsemnat|solicit|cerere|declar` stems, > 4 pages of dense text, title matches
  `metodologie|procedur[aă]|ordin|regulament|lege|hot[aă]r[aâ]re|anun[țt]|calendar`.
- "Form" signals: blank runs, `subsemnat`, checkbox glyphs (`|¯|`, `☐`, `[ ]`),
  short (≤3 pages), `semnătur` near the end.
- XLSX are data tables → R7 by default (revisit only if Radu wants spreadsheet forms).
- RTF (72) → convert with LibreOffice like DOC, then classify normally.
- Images (15) → R7 (or R6 if clearly a scanned form worth it).

**Authoring-vs-detection economics (R4 vs R5 tiebreaker):** author when the form
is linear prose with ≤ ~30 fields, or shares ≥60% of its structure with an
existing block/spec, or fans out to ≥3 institutions. Detect (overlay) when the
layout is a dense pre-printed grid, has pixel-exact legal layout requirements
(construction F-series), or is a one-institution one-off with >30 structured
fields. When genuinely unsure: author — authored output is deterministic and
maintainable; detection output always needs review anyway.

---

## 6. Phase plan

Execute in order; each phase has an acceptance gate. Estimated coverage is of the
3,860 unique documents.

### Phase 0 — Corpus manifest ✅ DONE 2026-07-08

Built as specified: `manifest/manifest.json` (8,477 file records, 3,905 unique
docs), extracts under `manifest/text/<md5>.txt` (gitignored). Scripts:
`build_manifest.py` (walk/md5/PDF+DOCX extract; uses `\\?\` long-path prefix),
`convert_doc_batch.py` (LibreOffice DOC/RTF, batched + resumable).
**Gate ✅:** counts reconcile with §2 modulo the long-path correction (§2.0b);
20+ records spot-checked. 1 known extraction failure: one DOC hangs LibreOffice
(`c06e0f2d445dd4b56683f039302b7849`, routed R6). Original spec follows:

#### (original Phase 0 spec)
Build `scripts/edirect/manifest/manifest.json` (and commit it): one record per
FILE with `{path, institution, filenameStem, eDirectDocId, ext, md5, uniqueDocId
(md5), isDupOf}`; one record per UNIQUE doc with `{md5, exts, copies[],
textExtractPath, pageCount, hasAcroForm, textLen, classification: null}`.
- Text extraction: PyMuPDF for PDF; DOCX via `document.xml` strip; DOC/RTF via one
  batched `soffice --convert-to txt:Text (encoded):UTF8` call per 200 files
  (LibreOffice CLI struggles with very long arg lists; batch and verify counts).
- Store extracts under `manifest/text/<md5>.txt` (gitignore the text dir if large;
  commit the JSON).
- **Gate:** manifest counts reconcile with §2 numbers; spot-check 20 records.

### Phase 1 — Classification & routing ✅ DONE 2026-07-08 (sign-off pending)

100% of the 3,905 unique docs routed. Rule pass (`manifest/route_rules.py`)
decided 3,287; the undecided 618 were classified by 11 parallel Claude
subagents (no API key on this machine — `make_llm_batches.py` +
`apply_llm_results.py`, batches under `manifest/llm-batches/`). Result
(unique / files): R0 134/219 · R2 139/1,066 · R3 105/434 · R4 2,274/3,496 ·
R5 329/547 · R6 577/889 · R7 347/1,826. Review: `manifest/routing-review.md`
(includes the Phase 3 R3 queue ranked by fan-out — igpf-aviz-frontiera 98×
confirmed — and the full R7 list).
**Gate:** 100% routed ✅; 50-doc stratified re-check 48/50 = 96% ✅ (2 fixes
applied to the manifest); **Radu's R7 sign-off PENDING** — see routing-review.md.
Note: R4 is deliberately coarse (name-rule R2 only); Phase 2's similarity
matcher is expected to pull several hundred R4 docs into R2. Original spec:

#### (original Phase 1 spec)
Assign every unique doc a route R0–R7 + confidence.
1. Rules first (cheap, deterministic): §5 heuristics + duplicate-group names.
2. LLM batch for the undecided middle (~likely 1,500–2,000 docs): the Claude API
   (see `llm/corpus_batch.py` for the existing batch harness pattern) with a
   compact prompt: first 1,500 chars of text + filename + institution → JSON
   `{route, archetypeGuess, isNationalModel, confidence, reason}`.
3. Human-in-the-loop: emit `manifest/routing-review.md` — every LOW-confidence
   call grouped by route for Radu to skim.
- **Gate:** 100% of unique docs have a route; sample 50 across routes, ≥90%
  agreement on manual re-check; Radu signs off on the R7 (exclusion) list.

### Phase 2 — Archetype matching ✅ MATCHING DONE 2026-07-08 (materialization pending publish)

Built `templates/specs/reference/` (canonical texts extracted from the built
generic PDFs via `extract_references.py`) and `manifest/match_archetypes.py`
(NOT .mjs — the manifest tooling is Python). Metric note: plain char-3-gram
cosine scored generic admin boilerplate too high (0.6–0.75 band mostly false);
switched to **IDF-weighted word uni+bigrams** over the candidate corpus, which
produced a clean bimodal split. Thresholds applied empirically: ≥0.75 strong →
R2; 0.35–0.75 eyeball queue (54 docs), adjudicated by content rules
(`adjudicate_queue.py`): 35 true ITL 010 instances (header noise depressed
scores) → R2, 11 → new R3 national models, 8 kept for Radu.
**Matcher discoveries — new national models for Appendix C:** DSP Modelul
nr. 4, DSP Modelul nr. 7 (Colegiul Farmaciștilor), Legea 544 formular-tip
solicitare + reclamație administrativă, ITL atestare-fiscală PJ variant.
Post-match totals: R2 174 unique / 1,193 files; R3 116 / 476.
**Reality check vs the ~1,200–1,800 estimate:** honest text similarity says
most of the old "cerere tip" mass is NOT the same form as an archetype — it
is R4 one-offs sharing structure, not text. The files-covered path runs
through Phase 3 replicas (R3 clustering), not through looser R2 thresholds.
**Materialization** per §12 decision (1c): NO stamped instances — one generic
template per archetype; every matched doc's eDirectDocIds join to it and
procedure pages deep-link with `?institution=` (FillPage support shipped
2026-07-08). The join map + editability gate run at publish time (Phase 5).
Original spec follows:

#### (original Phase 2 spec)
For every R2 doc, decide generic-vs-stamped and materialize:
1. Build `match-archetypes.mjs`: normalized-text similarity (token Jaccard or
   cosine on 3-grams; diacritics folded — WATCH the ş/ș cedilla-vs-comma problem,
   fold BOTH to s) between each unique doc and each spec's reference text. Keep
   spec reference texts in `specs/reference/<id>.txt` (create: the extracted text
   the spec was authored from).
2. Threshold empirically (start: ≥0.75 similarity = R2-strong; 0.55–0.75 = queue
   for eyeball). BELOW threshold → back to R3/R4/R5.
3. For matched docs: extract the institution (directory name = institution;
   `lib/locality-county.mjs` helps normalize county) → run
   `build.mjs <spec> --institution "<name>"` → stamped instance. Institutions
   with logos: none are scraped today — logo slot stays empty unless Radu supplies
   assets (see §12 Q4).
4. **Do NOT create 700 near-identical Firestore templates blindly** — see §7.10
   for the instance-vs-shared decision.
- **Gate:** every R2 doc has an instance id + `test-editability.mjs`-equivalent
  pass; 30-doc random visual sample: rendered instance vs original text — no
  missing REQUIRED fields, no semantic betrayals.

### Phase 3 — National-model replicas (~2–3 sessions; ~300–600 docs, huge fan-out)
The DSP-model playbook, industrialized:
1. From the manifest, cluster unique docs by normalized text similarity ACROSS
   institutions (≥3 institutions, ≥0.9 similarity ⇒ national model candidate).
2. For each cluster: extract the canonical text, identify the legal anchor
   (annex number, law), author `specs/<id>.mjs` as a REPLICA (faithful text,
   fields where the blanks are). Known candidates already spotted **[measured]**:
   - IGPF border-zone aviz cerere (98× byte-identical + variants; includes
     născut-la + CI serie/nr; pairs with the two tabel-nominal annexes),
   - ITL family beyond 010 (ITL 001–016 exist nationally: impunere clădiri/
     terenuri/auto, scutiri — search catalog for `ITL`),
   - F-series construcții (F.8/F.9 autorizație construire — structured, may be R5),
   - Anexa 29 (utilities?), DSP Model 4/16 (seen in sampling), education
     enrollment forms (cerere-tip înscriere — structured SIIIR),
   - social-assistance forms (VMG, ASF — Anexa models like alocație).
3. Reuse blocks; new layout needs go into `author.mjs` as primitives (e.g.
   comb-cell CNP boxes `|_|_|_|`, two-column page layouts) — never per-spec hacks.
- **Gate:** each replica passes editability + a side-by-side text diff against the
  canonical source (allow whitespace/hyphenation differences; flag content drift).

### Phase 4 — Detection route hardening (R5+R6; ~881 text PDFs partially, 524 scans; 2–4 sessions)
For documents where authoring is uneconomical:
1. Convert R5/R6 DOC-originated docs to PDF first (`convert-docs.mjs`).
2. Run the existing paddle/llm detection → `apply-fields.mjs`.
3. **Port the editability gate**: extend `apply-fields.mjs`/`acroform-writer.mjs`
   with the same `/DR`+`/DA` NotoSans registration, Required flags where the
   detector is confident, classic xref, and a `test-editability`-style check
   (field count > 0, DA font, fill round-trip). Currently the overlay pipeline
   has NONE of the editability hardening — this is the main engineering task.
4. Scans: paddle OCR route; set expectations — output labeled `acroFormOrigin:
   'generated'` and NOT surfaced as "completabil online" until human-reviewed.
   Low-value scans (old orders, stamped photocopies) → downgrade to R7.
- **Gate:** detection outputs pass the same editability checklist; per-doc review
  queue (`needs-review/` dir pattern already exists) before publishing.

### Phase 5 — Publishing at scale (~1–2 sessions + Radu's auth)
1. Recover/rewrite the bulk upload scripts (progress-file patterns exist:
   `upload-templates-progress.json`). Steps per template: Drive upload (folder
   taxonomy: keep the existing catalog folder), set `driveFileId` +
   `originalDriveFileId` (the untouched source), `saveTemplate` to Firestore,
   join `eDirectDocId`/`procedureId` from `index.json`.
2. Firestore constraints: doc limit 1 MiB — fine (largest archetype is 42 fields ≈
   8 KB), but the aggregate `catalog/index` doc is the risk at ~3,900 entries ×
   ~200 B ≈ 800 KB — **check `build-catalog-index.mjs` sizing; likely needs
   sharding into `catalog/index-{0..N}` pages BEFORE bulk publish.**
3. Rate limits: Drive API 12,000 queries/min default but uploads are heavier —
   batch with backoff; Firestore 500 writes/batch.
4. Rollout: publish in waves (archetype instances → replicas → detection), run
   `catalog:rebuild` + sitemap per wave, watch the VoteWidget for user signals.
- **Gate:** every published id loads on `/fill/:id` (write a headless smoke script
  hitting the Firestore fetch + Drive download + `fillPdf` with dummy values for a
  random 5% sample per wave).

### Phase 6 — The long tail + maintenance loop
1. Re-run the coverage sampling protocol (COVERAGE-SAMPLE.md §method) on the FULL
   corpus for the final number; publish it in README.
2. New-scrape delta pipeline: `download.mjs` → manifest update → classifier → route.
3. Drift watch: national models change with legislation (new ITL model years,
   DSP order revisions). Record each replica's legal anchor + year in its spec
   header; a yearly re-scrape diff flags text drift.

---

## 7. Edge-case catalog (exhaustive; consult before routing/authoring anything)

### 7.1 Text & encoding
- **Cedilla vs comma-below:** ş/ţ (U+015F/U+0163, legacy) vs ș/ț (U+0219/U+021B,
  correct). The corpus mixes both, plus composed/decomposed forms. ALWAYS fold
  both to s/t for matching; ALWAYS emit comma-below in authored text; NotoSans
  covers both.
- **Broken PDF text extraction:** older PDFs (e.g. Orăștie sample) yield mojibake
  (`obŃinerea` — Ń for ț from legacy encodings). Detection: >2% non-Romanian
  letters in extract → treat as R6-ish (extraction unreliable), prefer the DOC
  sibling if the same eDirectDocId exists in both formats.
- **Soft hyphens, NBSP, zero-width chars** in DOCX XML — strip in normalization.
- **ALL-CAPS legal titles** — normalize case for matching; preserve for replica display.

### 7.2 PDF internals
- **Encrypted/permission-locked PDFs:** `PDFDocument.load(..., {ignoreEncryption:
  true})` already used by acroform-writer; PyMuPDF may still refuse — catch and
  route R6/R7.
- **XFA forms:** if `scan_acroform.py` reports XFA (Adobe LiveCycle), pdf-lib
  can't fill them reliably → re-author (R3/R4) instead of reusing (a few
  government forms are XFA; ANAF F-forms notoriously).
- **Broken AcroForms in the 133 R0 PDFs:** some will have fields with no widgets,
  duplicate names, JS validation, or appearance-less fields. R0 verification =
  run them through the §8.1 checklist; failures downgrade to R2–R5.
- **pdf-lib xref quirk:** object-stream output trips MuPDF (`cannot find object in
  xref`) — always `save({useObjectStreams:false})`.
- **flatten() dangling /Annots:** fixed in `pdf-fill.ts` (22da35c) — keep the
  scrub if you touch that code; the same scrub is in verify/test scripts.
- **NeedAppearances:** deliberately NOT set (viewers that ignore it show blanks).
  If Acrobat/Chrome testing ever shows stale appearances on direct editing,
  reconsider per-field.
- **Landscape/A5/Letter pages, rotated pages (`/Rotate 90`):** authored output is
  A4 portrait; detection overlay must use the source page box — `acroform-writer`
  uses absolute coords, verify against `page.getSize()` and rotation before overlay.
- **Multi-column layouts:** the author writes single-column; national models with
  two-column headers (e.g. "Anexa/Model" boxes top-right like ITL 010's) are
  approximated with paragraphs — acceptable; note it in the spec header.

### 7.3 Form semantics
- **Checkbox vs radio:** Romanian forms write mutually exclusive options as
  checkboxes ("se bifează cu X"). We author them as independent checkboxes
  (matches paper behavior). If Radu wants enforcement, `type:'radio'` is supported
  by schema-builder/pdf-fill but the author has no radio primitive yet — add one
  only when a form truly needs it.
- **Inline blanks mid-sentence** ("posesor al CI seria ___ nr ___"): authored
  forms restructure into labeled rows — a deliberate fidelity trade documented in
  each spec. Replicas of legally-fixed text keep sentences and put fields after a
  colon where feasible.
- **Dual/triple signatures** (representative + farmacist-șef; both contract
  parties): use distinct `semnatura_*` names — ALL match the `/semn[aă]tur/`
  overlay heuristic and become drag-signature slots. Verify the overlay handles
  2+ slots on one page (it does — `widgetRects` supports multiple).
- **Date fields:** label `data` matches the date validation (`ZZ.LL.AAAA`).
  Optional date fields get the `^$|`-prefixed pattern (schema-builder applies
  regex before `.optional()` — empty string must pass).
- **CNP:** maxLength 13 + `^\d{13}$` (required) — but CUI needs 12 (RO prefix),
  set explicitly (representativeBlock does).
- **Tables:** `table` primitive: field per cell, static Nr. crt. Web form renders
  42 inputs — acceptable but consider a UI grouping improvement later (out of
  scope for editability).
- **"Anexez următoarele" checklists:** author as checkboxes + one free-text
  "alte documente" field (see `cerere-alocatie-copii`).
- **Conditional sections** ("se completează doar dacă..."): author everything as
  optional fields + `hint`; NO conditional logic in Template JSON (schema has no
  support; do not invent it without app work).

### 7.4 Institution variance
- **Same form, different header only** → ONE spec + stamped instances (the slot model).
- **County-blank national models** (DSP Model 2 "a Județului ......") → the
  addressee slot IS the county; stamped per-DSP or editable.
- **Fixed-by-law addressees** (Model 3 → Ministry) → baked text, never a slot.
- **Institution renamed/merged since scrape:** directory names are the scrape-time
  truth; Firestore `organization` should carry the directory name for the join —
  don't "fix" names ad hoc.
- **Diacritics-less directory names** (`Directia`, `Politiei`) — that's how they
  are; display names in the app may differ; never fuzzy-match institutions by
  name alone, use the directory string.

### 7.5 Duplicates & versions
- **Byte-identical (R1):** trivial — same md5.
- **Near-identical** (same text, different Word saved-by): catch in Phase 3
  clustering (0.9+ similarity), treat as the same national model.
- **Same eDirectDocId in two formats** (PDF + DOC of one form): prefer the
  born-digital DOC for text, publish ONE template, join both listing ids.
- **Version drift** (2017 vs 2018 methodology): different docs, both likely R7.
- **Same filename, different content** across institutions ("Cerere tip_1234" ids
  differ) — md5 disambiguates; never key on filename.

### 7.6 DOC/DOCX/RTF conversion
- LibreOffice batch: headless, one process per ~200 files; UTF-8 txt filter
  `txt:Text (encoded):UTF8`; DOCX text via XML strip is faster and better (keep
  `</w:p>`→`\n`, `</w:tc>`→` | ` to preserve table cells).
- **Tracked changes/comments** in DOCX: strip `w:del`/`w:ins` markup — accept
  insertions, drop deletions.
- **Embedded images of text** inside DOC (stamped scans pasted into Word): text
  extract comes up near-empty → route like a scan (R6).
- **Password-protected DOC:** rare; soffice fails → R7 with reason.
- **Textboxes/shapes** (Sinaia sample had spaced-out letters `Su b s emn a t u l`)
  — normalization must collapse multi-space runs BEFORE matching.

### 7.7 Scans (524 unique)
- Split by value: forms people actually fill (route R6-OCR) vs informational
  scans (R7). The filename + institution + procedure join tells you which.
- OCR: paddle pipeline exists; Romanian diacritics OCR quality is mediocre —
  detected labels MUST go through `romanian-patterns.mjs` fuzzy matching, and
  outputs default to needs-review, never straight to "completabil online".
- Skewed/rotated scans: paddle handles mild skew; >5° reject to review.
- Multi-form scans (several forms in one PDF): detect via repeated `CERERE`
  headings; if found, flag for manual split (do not auto-split).

### 7.8 App/platform constraints
- **Firestore:** 1 MiB/doc (fine); watch the `catalog/index` aggregate (§6 P5);
  500 writes per batch; the `templates` collection at ~4k docs is fine.
- **Drive:** public-readable folder; `fetchPdfFromDrive` goes through
  `api/pdf.ts` (service account) — 3,900 templates ≈ 3,900+ files; folder
  listing performance is irrelevant (direct id fetch) but ADMIN UI lists may
  need paging.
- **Sitemap:** 3,900 URLs — under the 50k limit, fine; rebuild per wave.
- **SEO/JSON-LD:** FillPage emits DigitalDocument; the SSR function
  (`/fill/:id`) must keep up — verify it doesn't fetch the full fields[] for meta.
- **Votes:** `voteCount` lives on templates — bulk-created templates start at 0;
  keep the sub-collection rules unchanged.
- **GDPR:** publishing blank forms is fine; NEVER commit filled samples with real
  CNPs (verify-fill uses fake data — keep it that way; `2920512123456` is fake).
- **Vercel:** no build-time impact — templates are data, not code.

### 7.9 Reconciliation with the ALREADY-LIVE catalog (do this before any publish)

The Firestore `templates` collection is NOT empty — templates were published by
the earlier detection pipeline (see `upload-templates-progress.json` traces and
`backfill-acroform-origin.mjs`). New authored/replica templates will OVERLAP
with live ones for the same source documents. Rules:

- **Inventory first:** `fetchAllTemplates()` (or a Node admin script) → dump
  live templates with their `eDirectDocId`/`driveFileId`/`acroFormOrigin`/
  `voteCount`. Join against the manifest by `eDirectDocId`.
- **Same source doc, new authored template supersedes detected one:** keep the
  OLD template id alive (URLs/SEO/votes exist) — prefer UPDATING the existing
  Firestore doc in place: new `driveFileId` (authored PDF), new `fields[]`,
  bump `version`, keep `voteCount` and `eDirectDocId`. Only mint a new id when
  the old one never existed. Do NOT delete; `archived: true` is the retirement
  mechanism (FillPage 404s archived templates gracefully).
- **Existing template ids are UUIDs; authored spec ids are kebab-case.** Both are
  valid Firestore doc ids. New standalone templates may use the kebab id, but a
  superseded template keeps its UUID — never break a published `/fill/:id` URL.
- **`originalDriveFileId`** must keep pointing at the untouched source bundle
  PDF; the authored PDF replaces only the fillable `driveFileId`.
- **Votes are user signal:** a template with negative votes that we supersede is
  a fidelity checkpoint — diff the old detected fields against the new authored
  ones before flipping.

### 7.10 Instance explosion (the big product decision — ASK RADU, §12 Q1)
Stamping per-institution instances of e.g. Model 3 could create 130 near-identical
catalog entries. Options:
  a) **One generic template per archetype/replica** (editable institution field)
     + join ALL matching eDirectDocIds to it. Catalog stays small; procedure
     pages all link to the same fill page. RECOMMENDED DEFAULT.
  b) Stamped instance per institution — better UX (pre-filled addressee), 130×
     catalog noise, 130× Drive files.
  c) Hybrid: generic template + `?institution=` URL param that pre-fills the
     addressee field client-side (needs a small FillPage feature: read query
     param → setValue). Best of both — one template, deep-linkable per
     institution. Requires ~20 lines in FillPage.
Decide before Phase 2 materialization; (c) is the best engineering answer but
touches app code.

---

## 8. Verification protocol

### 8.1 The editability checklist (every published PDF)
1. Loads in pdf-lib AND PyMuPDF without errors (classic xref).
2. Every Template field exists in the PDF, class matches type.
3. Text fields: `/DA` references an embedded Unicode font present in `/DR`.
4. Required flags mirror `isRequired`.
5. No orphan PDF fields absent from the Template.
6. Diacritics fill (ĂÂÎȘȚ ășțâî) → `updateFieldAppearances` → `flatten` →
   save → reopen: no dangling refs, no missing glyphs (visual spot-check).
7. maxLength set where the pattern demands (CNP 13, CUI 12, IBAN 24).
8. Optional-field validation patterns tolerate the empty string (`^$|`).

### 8.2 Gates per route
- R2/R3/R4 (authored): `test-editability.mjs` extended to cover new specs
  automatically (it already globs `specs/*.mjs`).
- R5/R6 (detected): build `test-editability-overlay.mjs` (Phase 4.3) with checks
  1–6 (7–8 depend on detector confidence).
- R0 (originals): a `verify-original.mjs` running checklist 1–6; failures downgrade.
- Publishing smoke (Phase 5 gate): headless fetch→fill→flatten on 5% samples.

### 8.3 Visual QA protocol
Render page 0 (+ last page) at 100 dpi for every NEW spec/replica and eyeball;
for bulk instances, eyeball 1 per 25 with priority to multi-page and table forms.
PyMuPDF renders complain-free only if xref is classic — treat new warnings as
regressions.

---

## 9. Success metrics

Report against UNIQUE documents (3,860) AND against catalog files (8,403 — the
user-facing number, where duplicates multiply wins):

- % routed (target: 100% by end of Phase 1)
- % DONE per §1 (targets: ≥45% after Phase 2-3 uniques ≈ but ~70% of FILES thanks
  to duplicate fan-out; ≥85% files after Phase 4; remainder explicitly excluded)
- % excluded-with-reason (expect 20–30% of uniques: the education/methodology mass)
- Editability pass rate at publish time: 100% (hard gate, no exceptions)
- Post-publish: VoteWidget negative-vote rate per wave as a fidelity signal.

---

## 10. Environment quirks (Windows, this machine)

- `PYTHONIOENCODING=utf-8` before ANY Python that prints Romanian text.
- Node dynamic import needs `pathToFileURL(...)` (already fixed in build.mjs).
- Bash-in-Windows path duality: `/c/...` for bash tools, `C:/...` for Python/Node.
- LibreOffice: `C:\Program Files\LibreOffice\program\soffice.exe`; ONE instance
  at a time (it locks a profile; parallel invocations fail silently).
- PyMuPDF 1.27.x installed and working; `fitz.TOOLS.mupdf_display_errors(False)`
  to silence stderr noise in batch scans.
- The corpus also lives partially on Radu's Mac (per project memory) — treat
  `downloads/` on THIS machine as the working truth; do not assume the Mac state.
- `node_modules` is a partial npm/pnpm mix: vitest works, eslint is NOT installed,
  `tsc -b` shows 4 pre-existing `pdfjs-dist` errors — not yours, don't chase them.

---

## 11. Suggested session breakdown for the next model

1. **Session A:** Phase 0 manifest + Phase 1 rule-based routing; emit
   `routing-review.md`; ask Radu the §12 questions.
2. **Session B:** LLM classification batch + finalize routing; start Phase 2
   matcher; build `specs/reference/` texts.
3. **Session C:** Phase 2 materialization (after §12 Q1 decision) + Phase 5
   catalog-index sharding check.
4. **Sessions D–E:** Phase 3 replica authoring (IGPF aviz first — 98× fan-out and
   its two annex tables are already built).
5. **Sessions F–G:** Phase 4 overlay hardening + scans triage.
6. **Session H:** Phase 5 bulk publish waves (needs Radu present for admin auth).
7. **Session I:** Phase 6 final coverage measurement + README/STATUS updates.

---

## 12. Open decisions — ASK RADU BEFORE THE RELEVANT PHASE

**Decided by Radu 2026-07-08 (in-session):**

1. **Instance model** (§7.10) → **(c) hybrid**: one generic template per
   archetype/replica + `?institution=` URL param pre-filling the addressee
   client-side in FillPage. All matching eDirectDocIds join to the one template.
2. **Exclusion policy** → **download-only with reason**; R7 docs stay in the
   catalog, labeled why they are not fillable.
3. **Scan ambition** → **ALL scans** (577 unique / 889 files) go through the
   OCR-assisted detection route (R6), not just a top-traffic slice. Outputs
   remain needs-review before any "completabil online" promise (§7.7 stands).
6. **`archetype` field** → **add properly** to `src/types/template.ts`
   (Template + SlimTemplate) before Phase 2 materialization.

**Still open (ask before Phase 2 stamping / Phase 5):**

4. **Logos** — the stamped-instance logo slot is unused (no logo assets scraped).
   Skip logos entirely, or source them (institution sites) as a nice-to-have?
   (Less urgent now: decision 1 means few stamped instances.)
5. **Publishing cadence** — waves per week? Who eyeballs the per-wave sample?

---

## Appendix A — Template JSON contract (copy of the essentials)

`Template`: `{id, name, description?, category?, organization?, county?,
procedure?, procedureId?, eDirectDocId?, version, createdAt, fields[],
archived?, driveFileId, originalDriveFileId?, acroFormOrigin?, voteCount?}`.
`TemplateField`: `{pdfFieldName, type:'text'|'checkbox'|'dropdown'|'radio'|
'unsupported', label, placeholder?, hint?, group?, order?, isRequired,
isMultiline?, maxLength?, options?, validation?{pattern,min,max,customMessage},
hidden?}`. Zod is compiled at runtime by `schema-builder.ts`; `hidden` fields are
skipped; enum types build from `options`.

## Appendix B — Commands cheat-sheet

```bash
cd scripts/edirect/templates
export PYTHONIOENCODING=utf-8
node build.mjs <spec-id> [--institution "X" --address "Y" --logo p.png]
node verify-fill.mjs <spec-id>          # → dist/<id>.filled.pdf
node test-editability.mjs               # ALL specs, the regression gate
python -c "import fitz; fitz.open('dist/<id>.filled.pdf')[0].get_pixmap(dpi=110).save('dist/p.png')"
# corpus census (reproduces §2):  see Appendix D
npm run catalog:rebuild                 # after any Firestore template changes
npm test                                # app suite (34 tests)
```

## Appendix C — Known national models (grow this list in Phase 3)

| Model | Legal anchor | Status |
|---|---|---|
| DSP Modelul nr. 2 (inspecție farmacie) | Legea 266/2008 norme | spec ✅ |
| DSP Modelul nr. 3 (autorizație funcționare) | Legea 266/2008 norme | spec ✅ |
| DSP Modelul nr. 4, nr. 16 | same order | seen in sampling, TODO |
| ITL 010 (atestare fiscală PF) | OMFP/MDRAP 2016 | spec ✅ |
| ITL 001–016 family (impunere, scutiri) | same | search corpus, TODO |
| F.8/F.9 (autorizație construire) | Legea 50/1991 norme | structured; likely R5 |
| Anexa nr. 1 alocație de stat | Legea 61/1993 norme | spec ✅ (simplified) |
| IGPF aviz zonă frontieră + 2 tabele | PS-IGPF | tables ✅, cerere TODO (98×!) |
| Cerere înscriere învățământ (SIIIR) | ME orders | structured; R5 or dedicated spec |
| Formular 544/2001 | HG 123/2002 | spec ✅ |
| Petiție model | OG 27/2002 | spec ✅ |
| 544 formular-tip solicitare (Anexa 1/4 norme) | HG 123/2002 (rev.) | found by matcher 2026-07-08; replica TODO |
| 544 reclamație administrativă (Anexa 2a/2b) | HG 123/2002 | found by matcher; replica TODO |
| DSP Modelul nr. 4 | Legea 266/2008 norme | found by matcher; replica TODO |
| DSP Modelul nr. 7 (dovadă Colegiul Farmaciștilor) | Legea 266/2008 norme | found by matcher; replica TODO |
| ITL atestare fiscală PJ (Anexa 11-adjacent) | OMFP/MDRAP 2016 | PJ variant of ITL 010; replica TODO |

## Appendix D — Reproducing the census **[measured 2026-07-02]**

```python
# unique/dup census: walk downloads/, md5 every file, group.
# AcroForm/text/scan split: for unique .pdf only —
#   fitz.open(p); has_form = bool(d.is_form_pdf)
#   txt = sum(len(d[i].get_text()) for i in range(min(2, d.page_count)))
#   scan if txt < 50 and not has_form
# Results 2026-07-02: files=8403 uniq=3860 pdf=3203 docx=2744 doc=2251
#   xlsx=118 rtf=72 img=15 | uniqPDF=1538 → acroform=133 text=881 scan=524
```

---
_End of roadmap. When you finish a phase, update §6 in place, tick the gates, and
append a dated progress note at the bottom of STATUS.md. Leave the numbers in §2
alone — they are the 2026-07-02 baseline; add new measurements alongside, dated._
