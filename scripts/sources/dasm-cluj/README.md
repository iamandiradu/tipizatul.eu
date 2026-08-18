# DASM Cluj-Napoca — Direcția de Asistență Socială și Medicală

Source: <https://dasmclujnapoca.ro/formulare/>. The institution does not publish
on eDirect, so this directory scrapes its forms page directly. See
[../README.md](../README.md) for the conventions every source follows.

## What the scrape found

16 procedures, 102 document rows, **86 unique files** (several rows link the
same file — the venit-minim annex alone backs four).

| | |
|---|---|
| Editable (an authored replica serves them) | **62 files · 74 of the 102 rows** |
| Download-only, informative | 20 |
| Download-only, other reasons | 4 |

The page's structure carries the grouping: an `h2` names a service, an optional
`h3` names a sub-group inside it, and each `.table-row` is one document — with
its URL sitting in a trailing `.link-block` as *text*, not as an anchor, which
is why an ordinary link scrape finds almost nothing here. An `h3` becomes its
own procedure (alocație de stat and stimulent de inserție are different
services), an `h2` without one keeps its own rows.

## Pipeline

```bash
node scripts/sources/dasm-cluj/fetch.mjs            # → procedures.json
node scripts/sources/dasm-cluj/download.mjs         # → downloads/ (gitignored)
node scripts/sources/dasm-cluj/build-joins.mjs      # archetype-map.json → archetype-joins.json
node scripts/edirect/build-procedures.mjs           # → public/procedures.json
```

`fetch.mjs --html path/to/saved.html` parses a saved copy instead of fetching,
and `fetch.mjs --dry-run` prints the grouping without writing. `build-joins.mjs
--check` verifies the map without rewriting the joins — run it after a re-scrape
to see whether the institution added or renamed anything.

## The replicas

45 specs under `scripts/edirect/templates/specs/dasm-cj-*.mjs` reproduce DASM's
own forms; each declares `organization: 'Direcția de Asistență Socială și
Medicală Cluj-Napoca'` and `county: 'Cluj'`, so the catalog files them under
that institution without a stamped per-instance build.

Twelve more documents are national models used far beyond Cluj. Those are
authored as generic archetypes with no `organization` — they reach DASM's
procedure pages through the joins, and any other institution that publishes the
same annex can join the same template later:

`cerere-venit-minim-incluziune` (Anexa nr. 1 la H.G. 1154/2022 — the VMI,
ajutor de încălzire and supliment pentru energie form, 205 fields over 8 pages),
`adeverinta-indemnizatie-crestere-copil` (Anexa nr. 2, H.G. 52/2011),
`adeverinta-vechime-munca` (Anexa nr. 10, O.U.G. 57/2019),
`anexa-informatii-suplimentare-ue`, `declaratie-venituri-pfa`,
`cerere-subventie-legea-34-1998`, `formular-inscriere-concurs-contractual`,
`formular-inscriere-functie-publica`, `cv-european-hg-1021-2004`,
`declaratie-oug-24-2008`, plus two joins to archetypes that already existed
(`cerere-alocatie-copii`, `declaratie-consimtamant`).

Shared body modules keep the families consistent: `_dasm-cluj.mjs` (addressee,
registry line, e-mail consent, GDPR footer, consent declaration), `_dasm-hr.mjs`
(letterhead and employee rows), `_dasm-locativ.mjs`, `_dasm-czv.mjs`,
`_dasm-ap-adeverinta.mjs`.

## What is deliberately not editable

- **`Cerere-tip-completata-si-semnata-OBLIGATORIU-de-ambii-parinti.pdf`** —
  Anexa nr. 1 la H.G. 52/2011, the A.J.P.I.S. application for indemnizație /
  stimulent / alocație. This copy **already carries a 266-field AcroForm** from
  A.J.P.I.S., so authoring a replica would replace a genuine original with a
  reproduction. It should be published through the originals route
  (`acroFormOrigin: 'original'`), which needs Drive + Firestore credentials —
  see "Publishing" below. `Cerere_indemnizatie_model_iunie_2016.pdf` is an
  image-only scan of the same document and is covered by it.
- **`cerere-CIS.doc`** (Centrul de incluziune socială) — the institution's own
  link returns HTTP 404. Nothing to author from until they re-upload it.
- **`Cerere2024-v5.pdf`** — a PDF Portfolio wrapper whose only page says to open
  it in Acrobat. The current-season `CERERE-2025.pdf` supersedes it.
- **Anexele A și B** of the Legea 34/1998 subsidy application — multi-page
  narrative annexes (up to three pages of free description per unit of social
  assistance). The cerere itself is replicated; the annexes stay download-only.
- **20 informative documents** — acte necesare, criterii de eligibilitate,
  liste de bunuri, comunicate, H.C.L. 520/2024, the two SSM training materials.
  They are reading material, not forms.

## Publishing

Nothing here is published automatically. Once the templates are to be shipped:

```bash
node scripts/edirect/templates/build.mjs --all dasm-cj-   # dist/*.pdf + *.template.json
node scripts/edirect/publish-archetypes.mjs --dry-run     # check the join counts
node scripts/edirect/publish-archetypes.mjs               # Drive + Firestore
npm run catalog:rebuild                                   # catalog index + sitemap
```

The source documents themselves can be mirrored to Drive the same way eDirect's
are, so a download survives the institution reorganising its site.
