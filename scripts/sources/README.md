# Non-eDirect sources

Most of the catalog comes from eDirect (`scripts/edirect/`). Some institutions
never published there, so their forms are scraped from their own site instead.
One directory per institution, each self-contained:

```
scripts/sources/<source-id>/
├── fetch.mjs             # site → procedures.json (Procedure-shaped)
├── download.mjs          # procedures.json → downloads/  (gitignored)
├── archetype-map.json    # published file name → authored archetype, by hand
├── build-joins.mjs       # archetype-map.json → archetype-joins.json
├── procedures.json       # committed: the scrape
└── archetype-joins.json  # committed: generated joins
```

Two files elsewhere consume them:

- `scripts/edirect/build-procedures.mjs` merges every
  `scripts/sources/*/procedures.json` into `public/procedures.json`, so the app
  reads one bundle.
- `scripts/edirect/publish-archetypes.mjs` merges every
  `scripts/sources/*/archetype-joins.json` into the join map, so an authored
  archetype published once serves these documents too.

## Conventions

**Ids are namespaced.** `procedureId` is `<prefix>-<slug>` and each document id
is `<prefix>-<hash-of-url>`. eDirect ids are numeric, so a namespaced id can
never collide with one, and the prefix says where a record came from at a
glance. Document ids are derived from the download URL rather than assigned in
page order, so re-scraping a reordered page keeps the template joins intact.

**Every scraped document is triaged.** `archetype-map.json` gives each
published file either an `archetype` (a replica authored from that exact
document) or a `downloadOnly` reason. `build-joins.mjs` fails on a document
that is in neither state, so a new form appearing on the institution's site
surfaces as a build error rather than quietly becoming un-editable.

**Procedures carry their source.** `source` and `sourceUrl` on each procedure
make the app cite the institution's own page instead of an eDirect URL that
would not resolve.

## Adding a source

1. `mkdir scripts/sources/<id>` and write `fetch.mjs` against the site's markup,
   exporting its pure helpers so they can be tested (`fetch.test.mjs` next to
   it; `vitest.config.ts` already includes `scripts/**/*.test.mjs`).
2. `node fetch.mjs` then `node download.mjs`.
3. Author the replicas under `scripts/edirect/templates/specs/` — see that
   directory's README. Specs for one institution's own forms declare
   `organization` and `county`; national models reused by many institutions
   stay generic and reach the institution through the joins.
4. Fill in `archetype-map.json`, run `build-joins.mjs`.
5. Register the two paths in `build-procedures.mjs` (`SOURCE_PATHS`) and
   `publish-archetypes.mjs` (`SOURCE_JOIN_PATHS`).
6. `node scripts/edirect/build-procedures.mjs` to refresh the public bundle.
