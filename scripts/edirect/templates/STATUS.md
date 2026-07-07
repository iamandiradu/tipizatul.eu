# Authored-templates project — status & handoff

_Last updated: 2026-07-02_

## The idea (why this exists)

Shift the project from **overlay** (detect where to drop inputs onto scraped
PDFs) to **author** (rewrite each common form once as a fillable AcroForm PDF
with inputs already in place, and stamp the institution name/logo as
per-instance slots). Most of the 8,477-file catalog is a shared root template
with thin per-institution customization, so authoring ~20 archetypes replaces
field detection on thousands of documents.

Decisions locked with Radu:
- **Format:** authored AcroForm PDFs that drop into the existing `pdf-fill`
  pipeline (NOT html-render, NOT a new layout-JSON renderer).
- **Scope:** research → plan → build, verifying each archetype before moving on.

See `TOP-20-ARCHETYPES.md` for the ranked list + catalog/Google rationale.

## Where things stand — ALL 22 archetypes built ✅ (top-20 complete)

| # | id | family | notes |
|---|----|--------|-------|
| 1 | `cerere-tip` | cerere | the validating slice |
| 2 | `cerere` | cerere | freeform body |
| 3 | `cerere-dsp` | cerere | DSP fields |
| 8 | `cerere-si-declaratie` | cerere | + art.326 decl + checkbox |
| 9 | `cerere-recunoastere` | cerere | recognition fields |
| 12 | `cerere-eliberare-certificat` | cerere | certificate fields |
| 4 | `declaratie-consimtamant` | declarație | operator slot + 2 checkboxes |
| 5 | `declaratie-gdpr` | declarație | informare + 1 checkbox |
| 6 | `acord-prelucrare-date` | declarație | operator + durata + checkbox |
| 7 | `declaratie-proprie-raspundere` | declarație | optional destination + art.326 |
| — | `cerere-dsp-model-2` | national model | Legea farmaciei 266/2008, inspecție DSP; **replica**, 2 pages |
| — | `cerere-dsp-model-3` | national model | idem, autorizație de funcționare (Min. Sănătății) |
| 14 | `cerere-atestare-fiscala` | national model | „Model 2016 ITL 010" replica, persoane fizice; 2 pages |
| 10 | `tabel-nominal-persoane` | tabel | 10-row grid: Nume/Prenume/CNP/CI |
| 11 | `tabel-nominal-auto` | tabel | 10-row grid: tip vehicul/nr. înmatriculare |
| 13 | `imputernicire` | two-party | `partyBlock` ×2 (mandant/mandatar), dual signatures |
| 15 | `cerere-544` | legal-text | HG 123/2002 model; response-mode checkboxes |
| 16 | `petitie` | legal-text | OG 27/2002; structure from the ADR catalog form |
| 17 | `contract-comodat` | two-party | art. 2146–2157 CC; sections I–V, 2 pages |
| 18 | `cerere-alocatie-copii` | legal-text | Anexa nr. 1 (Legea 61/1993); plată + anexe checkboxes |
| 19 | `cerere-concediu-crestere` | legal-text | către angajator, OUG 111/2010 |
| 20 | `cerere-cazier` | legal-text | MAI form fields (părinți, loc naștere, motiv) |

All 10 pass `build.mjs` + `verify-fill.mjs` (fill → updateFieldAppearances →
flatten). Several spot-checked by rasterizing with PyMuPDF — layout, diacritics
(ș ț ă â î), checkboxes, and the institution slot all render correctly.

### Editability batch (2026-07-02) — all 10 rebuilt with:
- **Validation patterns** in Template JSON (`VALIDATION_BY_PATTERN` in
  author.mjs): cnp/date/email/phone/iban regexes so schema-builder enforces
  format, not just presence. Optional fields get `^$|` prefixed (schema-builder
  applies the regex before `.optional()`, so blank '' would otherwise fail).
- **PDF Required flags** (`enableRequired`) mirroring `isRequired`.
- **NotoSans in AcroForm /DR + per-field /DA** (`registerAcroFormFont` +
  `finalizeTextField`) — typing ș/ț directly into the blank PDF (Acrobat,
  Chrome) now renders; previously fields defaulted to Helvetica/WinAnsi.
  `NeedAppearances` deliberately NOT set (blank-field risk in non-honoring
  viewers); flip it only if live testing shows stale appearances.
- **Classic xref** (`save({ useObjectStreams: false })`) — MuPDF-clean output.
- **Dangling /Annots scrub after flatten** — pdf-lib's `flatten()` deletes
  widget objects but leaves their refs in page /Annots. Fixed in
  verify-fill.mjs, test-editability.mjs, AND `src/lib/pdf-fill.ts` (app-wide:
  every downloaded fill previously carried dangling refs). App tests 34/34
  green after the change; tsc clean (4 pre-existing pdfjs-dist module errors
  are unrelated — node_modules is a partial npm/pnpm mix, eslint not installed).
- **`test-editability.mjs`** — round-trip guard over ALL specs: field
  presence/type/required/DA-font asserted against the Template JSON, orphan
  detection, diacritics fill + flatten + reopen with zero dangling refs.
  Run it after any author.mjs change.

Deferred from the editability plan: comb cells for CNP, `județ` dropdown from
`src/lib/counties.ts` (needs the county list importable from .mjs).

## Architecture

```
scripts/edirect/templates/
├── TOP-20-ARCHETYPES.md   # ranked list + rationale (research deliverable)
├── README.md              # how to build/verify/publish
├── STATUS.md              # this file
├── lib/author.mjs         # ArchetypeSpec → { pdfBytes, template }  (layout DSL)
├── specs/
│   ├── _shared.mjs        # identityBlock() + declarantBlock() (shared rows)
│   └── <id>.mjs           # one declarative spec per archetype (10 so far)
├── build.mjs              # CLI: spec (+ instance) → dist/<id>.pdf + .template.json
├── verify-fill.mjs        # fills sample data through the real fill logic
└── dist/                  # build output (already gitignored by root `dist/`)
```

### `lib/author.mjs` — the engine
- `buildArchetype(spec, instance)` → `{ pdfBytes, template }`. Creates an A4
  pdf-lib doc, embeds `public/fonts/NotoSans-Regular.ttf` (same font the
  browser fill uses), draws the header, then runs `spec.body(ctx, primitives,
  instance)`.
- **Layout cursor** `ctx.y` measured from the top; `topToPdfY()` converts to
  pdf-lib's bottom-left origin. `ctx.ensureSpace(n)` spills to a new page when
  needed (page-break support — wired into every primitive).
- **Primitives** passed to specs as `p`: `paragraph`, `labeledField`,
  `twoColFields`, `multilineField`, `checkbox`, `signatureFooter`,
  `addressee(c, opts)`.
- Field naming reuses `../lib/romanian-patterns.mjs` (`cnp` → maxLength 13,
  `telefon` → phone placeholder, etc.). Output `Template` JSON matches
  `src/types/template.ts` exactly, with `acroFormOrigin: 'generated'` +
  `archetype: <id>`.

### The institution slot (important domain rule)
A cerere is written BY a citizen TO an institution → institution is the
**addressee**, in the `Către,` block (first rows), NOT a letterhead. The
`addressee` primitive handles all cases:
- `instance.institutionName` supplied → **baked** static text (+ optional
  `addressLine`), and the `institutie` field is omitted.
- not supplied → an **editable** field (required by default).
- `addressee(c, { lead, label, name, required })` → reused as the GDPR
  **`Operatorul de date:`** slot and the optional **`În atenția (opțional):`**
  destination.

### `specs/_shared.mjs`
- `identityBlock(ctx, p, {email})` — applicant rows (nume, CNP+telefon, adresă,
  localitate+județ, e-mail). Used by the cerere family.
- `declarantBlock(ctx, p)` — declarant rows with **Act identitate (serie, nr.)**,
  no contact rows. Used by the declaration family.

## How to build / verify

```bash
cd scripts/edirect/templates
export PYTHONIOENCODING=utf-8           # only for the PyMuPDF preview

node build.mjs <id>                      # generic (editable institution field)
node build.mjs <id> --institution "Primăria X" --address "..." --logo logo.png
node verify-fill.mjs <id>                # → dist/<id>.filled.pdf

# visual check:
python -c "import fitz; fitz.open('dist/<id>.filled.pdf')[0].get_pixmap(dpi=110).save('dist/p.png')"
```

`verify-fill.mjs` synthesizes type-appropriate placeholders for any field not
in its curated SAMPLE map, so every archetype verifies without enumerating
every field. (Note: MuPDF prints harmless `cannot find object in xref` warnings
on pdf-lib output — non-fatal, the browser + app pipeline read the PDFs fine.)

## Coverage reality-check (2026-07-02)

Sampled 50 random files from the 1,745-file "cerere tip" cluster and classified
them against the authored archetype — see `COVERAGE-SAMPLE.md`. Headline: only
~5% are covered as-is; ~59% need a **legal-representative/business variant**
(reprezentant legal + sediul social + CUI), and most of those are verbatim
copies of *national annex models* (DSP „Modelul nr. 2/3", ITL 010, F.9) that
should be authored as exact replicas rather than approximated by a generic
skeleton. Follow-up list is in COVERAGE-SAMPLE.md, `representativeBlock` first.

Response shipped same day: `_shared.mjs#representativeBlock` (subsemnat +
entitate + sediu social + telefon/e-mail + ONRC + CUI@maxLength 12), checkbox
`indent` option for nested options, and `cerere-dsp-model-2` / `-model-3`
authored as faithful replicas from the extracted national text
(`specs/_dsp-farma.mjs` holds the shared body; the models differ in addressee,
request sentence, and one Model-3-only checkbox). Model 2's addressee bakes the
county DSP or falls back to an editable `dsp_judet` field; Model 3's addressee
is fixed by law (Ministry) and always baked. Both are 30 fields, 2 pages —
first real exercise of the page-break machinery. `test-editability.mjs` passes
for all 12. The generic `cerere-dsp` spec is superseded by the two models but
kept for the non-farma DSP correspondence case.

## What's left

Authoring is COMPLETE — all top-20 archetypes (22 specs, counting the two DSP
national models that supersede the generic #3 for farma) build, fill, flatten,
and pass `test-editability.mjs`. Shared machinery: `identityBlock`,
`declarantBlock`, `representativeBlock`, `partyBlock` (two-party docs, added
2026-07-02 with #13/#17), plus primitives `paragraph / labeledField /
twoColFields / multilineField / checkbox(indent) / table / signatureFooter /
addressee`.

Remaining work is not authoring:

1. **Publish** (admin, outward-facing — Radu's call): per README "Publishing
   into the live app" — Drive upload → `driveFileId` → Firestore
   `saveTemplate` → `npm run catalog:rebuild`. NOT done automatically.
2. **Commit** — everything under `scripts/edirect/templates/` plus the
   `src/lib/pdf-fill.ts` /Annots-scrub fix are uncommitted.
3. **Optional hardening** — comb cells for CNP, `județ` dropdown from
   `src/lib/counties.ts`, per-institution stamped instances of the national
   models (`build.mjs --institution` already supports this).
4. **Coverage follow-through** — re-run the COVERAGE-SAMPLE.md classification
   against the full archetype set for an updated coverage number; the
   remaining gaps (structured domain forms ~9%, scans) stay on the detection
   pipeline by design.

## Pick-up checklist for next session
- [ ] `node test-editability.mjs` — one command re-verifies all 22 archetypes.
- [ ] Publish decision + commit (see "What's left").
