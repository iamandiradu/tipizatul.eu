# Contributing to tipizatul.eu

Thanks for considering a contribution. This project is an open-source catalog of Romanian public-institution forms — every PR that adds a missing form, fixes a label, or improves the fill experience makes things a little less painful for someone at a counter.

## Quick links

- **Bug or feature idea**: [open an issue](../../issues/new). Check existing issues first.
- **Missing a form?** Use the **Propune un formular** button on [tipizatul.eu](https://tipizatul.eu). It's the fastest path.
- **Security issue**: see [SECURITY.md](./SECURITY.md). Please don't open a public issue.

## Local setup

Prerequisites: Node 20+, a Firebase project (Firestore + Auth + Drive API), and a Google service account.

```sh
git clone https://github.com/iamandiradu/tipizatul.eu.git
cd tipizatul.eu
npm install
cp .env.example .env.local      # then fill in your Firebase + Google credentials
npm run dev
```

The full env-var list is in the root [README](./README.md#environment-variables).

## Useful commands

```sh
npm run dev                 # vite dev server (http://127.0.0.1:5173)
npm run build               # tsc -b && vite build
npm run preview             # serve the production build
npx tsc --noEmit            # typecheck only
npm run catalog:rebuild     # rebuild catalog/index + sitemap.xml from Firestore
```

## Branch + PR workflow

1. Fork the repo (or, if you're a collaborator, branch off `main`).
2. Create a topic branch: `git checkout -b feat/short-description`.
3. Make focused commits — one logical change per commit.
4. Push and open a PR against `main`. Fill in the description with **what** changed and **why**.
5. Wait for review. CI (typecheck + build) must pass.

`main` is protected: no direct pushes, PRs require review, force pushes blocked.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(catalog): two-level grouping by county and institution
fix(pdf): handle multiline AcroForm fields
docs: link the public Google Drive catalog folder
perf: cache catalog reads across three layers
chore: ignore upload-templates run artifacts
```

Common types: `feat`, `fix`, `docs`, `perf`, `refactor`, `chore`, `test`. Optional scope in parens. Imperative mood, no trailing period.

## Code style

- TypeScript strict mode is on. Don't add `any` without a comment explaining why.
- Tailwind for styling. Don't introduce a CSS-in-JS lib.
- Keep React components in `src/components/` (reusable) or `src/pages/` (route-level).
- Default to writing no comments. Only add a comment when the *why* would surprise a future reader (a hidden constraint, a workaround, a non-obvious invariant).
- Prefer editing existing files over creating new ones.

## Adding a new form

Two paths, depending on volume:

- **One form, by hand** — sign in at `/admin`, click *Adaugă formular*, upload the PDF, annotate fields, save.
- **Many forms, via pipeline** — see [`scripts/edirect/README.md`](./scripts/edirect/README.md). The scraper fetches from [eDirect / e-guvernare.ro](https://edirect.e-guvernare.ro), extracts AcroForm fields, and bulk-uploads. After a bulk run, run `npm run catalog:rebuild` to refresh the homepage aggregate and sitemap.

## Tests

There's no formal test suite yet. Until there is, the bar is:

- `npx tsc --noEmit` passes
- `npm run build` produces a working bundle
- For UI changes, you've actually clicked through the change in `npm run dev`

Tests are welcome — Vitest is the natural fit if you want to add some.

## Architecture pointers

- `src/pages/CatalogPage.tsx` — the homepage. Reads `catalog/index` (slim aggregate), groups by county → institution.
- `src/pages/FillPage.tsx` — the form-fill page. Reads the full Template doc, fills the AcroForm client-side via `pdf-lib`, downloads.
- `src/pages/AdminPage.tsx` — the admin upload + annotation UI.
- `api/` — Vercel functions. `pdf.ts` proxies Drive PDFs; `fill.ts` SSRs per-form meta tags and JSON-LD.
- `scripts/edirect/` — bulk pipeline (scrape → convert → detect fields → upload → reorg → build aggregate → build sitemap).

## Questions

Open a [Discussion](../../discussions) or an issue. Be patient — this is a side project, but PRs that move it forward get a fast turnaround.
