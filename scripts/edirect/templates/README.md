# Authored archetype templates

The "rewrite, don't overlay" pipeline. Instead of detecting where to drop
inputs onto a scanned/Word form, we **author** each common form once as a
fillable AcroForm PDF with the inputs already in place, and stamp the
institution name/logo as per-instance slots.

See [TOP-20-ARCHETYPES.md](./TOP-20-ARCHETYPES.md) for the ranked list and
rationale.

## Layout

```
templates/
├── lib/author.mjs        # ArchetypeSpec → { pdfBytes, template }  (layout DSL)
├── specs/<id>.mjs        # one declarative spec per archetype
├── build.mjs             # CLI: spec (+ instance) → dist/<id>.pdf + .template.json
├── verify-fill.mjs       # fills with sample data through the real fill logic
└── dist/                 # build output (gitignored-candidate)
```

The author reuses `../lib/romanian-patterns.mjs` for field naming + hints, so
authored field names (`cnp`, `telefon`, `email`, …) match what the rest of the
system already expects. Output `Template` JSON matches `src/types/template.ts`.

## Build

```bash
export PYTHONIOENCODING=utf-8   # only needed for the PyMuPDF preview step

# Generic, end-user-fillable (institution becomes an editable field):
node build.mjs cerere-tip

# Every spec, or every spec with a given id prefix (a family is rebuilt together):
node build.mjs --all
node build.mjs --all dasm-cj-

# Stamped for a specific institution (name + logo baked into the header):
node build.mjs cerere-tip \
  --institution "Primăria Comunei Exemplu" \
  --address "Str. Exemplu nr. 1, jud. Ilfov" \
  --logo path/to/logo.png
```

Produces `dist/<id>.pdf` (fillable) and `dist/<id>.template.json`.

## Verify

```bash
node verify-fill.mjs cerere-tip          # → dist/cerere-tip.filled.pdf
```

Mirrors `src/lib/pdf-fill.ts` (text/checkbox fill + NotoSans embed +
`updateFieldAppearances` + `flatten`) so the authored template is proven to
fill and flatten before publishing. Open the `.filled.pdf` to eyeball it, or
rasterize with PyMuPDF:

```bash
python -c "import fitz; fitz.open('dist/cerere-tip.filled.pdf')[0].get_pixmap(dpi=110).save('dist/preview.png')"
```

## Replicating one institution's own form

Some forms exist only at one institution — a cerere addressed to „DIRECŢIA DE
ASISTENŢĂ SOCIALĂ ŞI MEDICALĂ" has no generic version to stamp. Such a spec
states its institution instead of taking one at build time:

```js
export const spec = {
  id: 'dasm-cj-cantina-gratuita',
  organization: 'Direcția de Asistență Socială și Medicală Cluj-Napoca',
  county: 'Cluj',
  body(ctx, p) {
    p.addressee(ctx, { baked: 'DIRECȚIA DE ASISTENȚĂ SOCIALĂ ȘI MEDICALĂ', bakedAddress: 'Serviciul Protecție Socială' })
    // …
  },
}
```

`organization`/`county` land on the Template JSON, so the catalog files the
form under that institution with no per-instance build. A *national* model that
many institutions reuse stays generic — it reaches each institution through the
document joins instead. See `scripts/sources/README.md`.

## Adding a new archetype

1. Copy `specs/cerere-tip.mjs` to `specs/<new-id>.mjs`.
2. Compose the body from the layout primitives passed into `body(ctx, p)`:
   `p.paragraph`, `p.labeledField`, `p.twoColFields`, `p.multilineField`,
   `p.signatureFooter`. Field names come from `name:` or are derived from the
   Romanian label.
3. `node build.mjs <new-id>` then `node verify-fill.mjs <new-id>`.

New layout shapes (e.g. the repeating-row table for `tabel-nominal-*`) get
added as new primitives in `lib/author.mjs`.

## Publishing into the live app

The app loads templates from **Firestore** (`templates/{id}`) and PDFs from
**Google Drive** (`driveFileId`). Authored output is NOT auto-published — that
step is the admin's, via the existing `/admin` upload flow:

1. Upload `dist/<id>.pdf` to the catalog Drive folder → get its `driveFileId`.
2. Set `driveFileId` on `<id>.template.json`.
3. Save the template to Firestore (admin upload, or `saveTemplate` in
   `src/lib/firestore.ts`).
4. `npm run catalog:rebuild` to refresh the catalog index + sitemap.

`acroFormOrigin` is set to `'generated'` (we authored the AcroForm), but unlike
detector output these labels are hand-curated and safe to surface as
"completabil online".
