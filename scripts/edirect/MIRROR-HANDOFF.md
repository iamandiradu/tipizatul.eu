# Mirror handoff — finish on the Mac

Written 2026-08-11 from the Windows PC. Read this top-to-bottom before running
anything; the work is nearly done and the remaining step is small, but it
depends on a file that only exists on the Windows machine.

## Why this exists

Procedure pages used to hotlink `edirect.e-guvernare.ro` directly for every
document download. That works until eDirect renames a file, drops it, or goes
down — at which point the download button 404s and we hold no copy. 105 of the
files we had already scraped were *already* dead by this measure.

The fix: mirror every eDirect source document into our own Drive, serve it
through `/api/file`, and keep the eDirect URL only as an attribution link.

**Scope note:** this covers documents that *have* a source file. Of ~19,300
documents in `public/procedures.json`, only 5,845 carry a `downloadUrl` at all.
The other ~13,500 are citizen-supplied (`Atasament`, `Document scanat`,
`Dovada de plata`, `Fotografie` — "your ID", "your proof of payment"), so eDirect
hosts nothing for them and there is nothing to mirror. That is correct data, not
a scrape gap. Don't go hunting for the missing 13,500.

## State as of this handoff

The Windows upload is **complete**: `done. ok=4452 fail=0`, and a follow-up
dry-run reports `0 file(s) to mirror`.

Done on Windows:

- **4,453 unique documents, 1,073 MB**, uploaded to Drive
  `Tipizatul.eu/PDFs/Mirror/`, every file shared `anyone: reader`. Zero failures.
- Each upload recorded in `scripts/edirect/mirror-progress.json` (1.5 MB),
  keyed by eDirect doc id.
- Code written: the mirror script, the `/api/file` proxy, the type additions,
  the `build-procedures.mjs` wiring, and the UI change. ❗ Only this document was
  committed at time of writing — make sure the branch carrying the code is
  pushed from Windows and pulled here, or the Mac has none of it.

> **Why 4,453 and not 4,479.** `index.json` repeats 43 ids as byte-identical
> rows. The original queue builder iterated rows, so 26 in-scope files uploaded
> twice; the second write overwrote the first's progress entry, leaving **26
> orphaned copies in Drive (3.9 MB)**. The mapping is unaffected — the duplicate
> rows are identical, so whichever copy won points at the right bytes — and
> `buildQueue` now dedupes by id. The orphans are harmless clutter; delete them
> by listing the `Mirror` folder and dropping files whose id is absent from
> `mirror-progress.json`. Every mirrored file carries
> `appProperties.eDirectDocId`, verified present on all 4,479.

Verified on Windows:

- 5 sampled mirrors re-downloaded byte-identical to their local copies, valid
  `%PDF-` headers, correct MIME, correct `Content-Disposition`, Romanian
  diacritics intact through UTF-8 filename encoding.
- Files landed under the *existing* `PDFs` folder (siblings: `Originals`, the
  per-org folders) — no parallel tree.
- Drive quota: 172.8 GB free of 200 GB. Non-issue.

Not done — **this is your job**:

- `build-procedures.mjs` has never been run with the mirror data, because it
  requires `upload-templates-progress.json`, which lives only on the Mac.

## ❗ Prerequisite: get both machines' files into one place

Two files must meet. They currently live apart:

| File | Lives on | Gitignored? |
|---|---|---|
| `scripts/edirect/mirror-progress.json` | **Windows** | no |
| `scripts/edirect/upload-templates-progress.json` | **Mac** | yes (`.gitignore:54`) |
| `scripts/edirect/index.json` | both | yes |
| `scripts/edirect/procedures.json` | both | no (48 MB, tracked) |

So: **pull `mirror-progress.json` over to the Mac.** It is not ignored, so if it
was committed and pushed from Windows, a plain `git pull` is enough. Check first:

```bash
git log --oneline -- scripts/edirect/mirror-progress.json
```

If that comes back empty, the file was never committed — get it across by any
means (AirDrop, scp, Drive) and drop it at `scripts/edirect/mirror-progress.json`.

> ❗ **Open decision, please make it deliberately.** Every other `*-progress.json`
> is gitignored as a local artifact. `mirror-progress.json` is *not* ignored, and
> I left it that way on purpose: unlike its siblings it is not scratch state, it
> is the only mapping from eDirect doc id → Drive file id, and the deployed site
> depends on it. Lose it and you re-upload 1 GB. Recommend committing it.
> If you'd rather keep the convention and ignore it, that's defensible — but then
> back it up somewhere, and know that the disaster-recovery path is rebuilding it
> from Drive: every mirrored file carries `appProperties.eDirectDocId`, so the
> mapping can be reconstructed by listing the `Mirror` folder.

## ❗ The step to run

```bash
cd <repo>
node scripts/edirect/build-procedures.mjs
```

No credentials needed — it is a pure local join over JSON. It rewrites
`public/procedures.json` (~15 MB, tracked).

Expected tail:

```
Wrote N procedures (…) from … unique procedureIds touched by … uploaded forms.
Output: …/public/procedures.json (… KB)
Mirror coverage: 5694/5845 downloadable documents (97.4%)
```

The coverage line is the number that matters, and **5694/5845 (97.4%)** is the
exact expected value — precomputed on Windows against the finished mirror, so
treat any other number as a problem. The 151 shortfall breaks down as:

- **140** documents whose file was already dead on eDirect when we scraped it
  (404s recorded in `download-progress.json`).
- **11** documents whose `downloadUrl` never resolved to an `eDirectDocId`.

Both keep the eDirect hotlink as fallback, which is the pre-existing behaviour.

Note the units: 4,453 *files* cover 5,694 *document occurrences*, because the
same form is referenced from many procedures. Don't compare the file count to
the coverage denominator — they aren't the same quantity.

If coverage prints **0/5845**, `mirror-progress.json` isn't being found — check
the path and that its top-level key is `mirrored`.

## Verify before committing

```bash
node -e "
const b=JSON.parse(require('fs').readFileSync('public/procedures.json','utf8'));
let linked=0,mirrored=0,sample=null;
for(const p of Object.values(b.procedures)) for(const d of p.documents||[]){
  if(!d.downloadUrl) continue; linked++;
  if(d.mirrorFileId){ mirrored++; sample??=d; }
}
console.log(mirrored+'/'+linked, 'documents mirrored');
console.log('sample:', JSON.stringify(sample,null,1));
"
```

Each mirrored document should carry `mirrorFileId`, `mirrorExt`,
`mirrorMimeType`, `mirrorBytes` — **and still carry its original `downloadUrl`**.
That is deliberate: the UI shows the eDirect link as a small "sursa eDirect"
attribution next to the download button, and it's the fallback for everything
unmirrored. If `downloadUrl` went missing, something is wrong.

Then:

```bash
npx vitest run          # 34 tests, all should pass
npm run build
```

## ❗ After that

1. Commit `public/procedures.json` (and `mirror-progress.json`, if you took the
   recommendation above).
2. Deploy. `/api/file` needs `GOOGLE_SERVICE_ACCOUNT_KEY` in the Vercel project —
   it is already set, since `/api/pdf` uses the same variable and scope
   (`drive.readonly`). The service account can read the mirrors because they are
   shared `anyone: reader`; it does not need to own them.
3. Load any procedure page and click a "Descarcă original" button. PDFs should
   open inline; `.doc`/`.docx`/`.xlsx` should download with a sensible filename.

## What changed in the code

| File | Change |
|---|---|
| `scripts/edirect/mirror-documents.mjs` | **new** — uploads local `downloads/` files to Drive, records `mirror-progress.json`. Resumable; `--dry-run --limit --concurrency --ext --all`. |
| `api/file.ts` | **new** — generic Drive proxy. Asks Drive for authoritative name/MIME (never trusts query params), whitelists MIME so an unexpected file can't render as HTML in our origin, sets `filename*` disposition, caches 24 h immutable. |
| `scripts/edirect/build-procedures.mjs` | reads `mirror-progress.json` (optional — absent is fine), attaches mirror fields, prints coverage. |
| `src/types/template.ts` | `ProcedureDocument` gains `mirrorFileId` / `mirrorExt` / `mirrorMimeType` / `mirrorBytes`. |
| `src/lib/drive.ts` | `mirrorFileUrl(fileId)` helper. |
| `src/pages/ProcedureDetailPage.tsx` | download button prefers the mirror, shows `DOCX · 42 KB`, keeps eDirect as "sursa eDirect". Unmirrored documents behave exactly as before. |

`api/pdf.ts` is untouched and still serves template PDFs — `/api/file` is its
general-purpose sibling, needed because only ~37% of mirrored files are PDFs
(the rest are `.docx`, `.doc`, `.xlsx`, `.rtf`, images).

## Gotchas already paid for — don't reintroduce them

- **Deliberately no `.doc` → `.pdf` conversion.** The `.doc` an institution
  publishes is the artifact the citizen is expected to submit; a LibreOffice
  re-render is not guaranteed to match it. Mirroring is byte-identical. A
  rendition pass layered *on top* of an intact mirror is fine as a follow-up —
  replacing the mirror with renders is not.
- **`getDrive()` / `getMirrorFolderId()` memoize the in-flight promise, not the
  resolved value.** Caching the value alone deadlocked the first run: N workers
  all saw `null` before the first OAuth consent finished and each opened a
  loopback server on port 53682 (`EADDRINUSE`). The folder one matters
  independently — `getOrCreateFolder` is look-then-create, so racing workers each
  create their own folder.
- **Drive caps `appProperties` at 124 bytes per key+value pair, UTF-8.** Storing
  the source URL there blew the limit and failed uploads. Only `eDirectDocId` is
  stored now; it resolves back to the URL through `index.json`.
- **OAuth token expiry.** The client is a Desktop app in project `tipizatul`,
  consented as `iamandiradustefan@gmail.com` (the account that owns the Drive
  tree — using a different one silently creates a second `Tipizatul.eu` tree).
  While the consent screen is in *Testing* status, refresh tokens expire after
  **7 days**, so a re-run months later will need fresh consent. The Mac step
  needs no credentials at all, so this only bites future mirror runs.

## Known issue, not addressed

Drive has **two `Originals` folders** under `Tipizatul.eu/PDFs/`. That is the same
look-then-create race, in `upload-originals.mjs`, which was never fixed — so
`originalDriveFileId` values are probably split across both. Harmless while both
folders' files stay shared, but it should be consolidated and the script given
the same promise-memoization fix. Untouched here on purpose: out of scope for the
mirror work.
