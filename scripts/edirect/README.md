# eDirect Scraper

Scripts to fetch and download public institution forms from [edirect.e-guvernare.ro](https://edirect.e-guvernare.ro/SitePages/FormulareView.aspx).

## About eDirect / PCUe

**eDirect** is Romania's *Punctul de Contact Unic electronic* (Electronic Single Point of Contact), operated by the Romanian government at [edirect.e-guvernare.ro](https://edirect.e-guvernare.ro). It serves as a centralised portal where Romanian public institutions (ministries, county councils, city halls, agencies, etc.) publish the official forms and documents required for administrative procedures.

Citizens and businesses use these forms to interact with the public administration — applying for permits, licences, certificates, registrations, and other services. The platform hosts over 8,800 downloadable documents (PDF, DOC, DOCX, XLSX) from hundreds of institutions across all 41 counties and Bucharest.

All documents on the platform are publicly accessible and free to download.

## Overview

The scraper works in two steps:

1. **`fetch-index.mjs`** — Queries the eDirect API and builds a local `index.json` manifest with metadata for all ~8,800 documents.
2. **`download.mjs`** — Reads the manifest and downloads files to disk, organised by institution. Supports incremental re-runs.

## Quick start

```bash
# 1. Build the index (takes ~30s)
node scripts/edirect/fetch-index.mjs

# 2. Download only PDFs
node scripts/edirect/download.mjs --ext pdf

# 3. Or download everything
node scripts/edirect/download.mjs
```

## fetch-index.mjs

Fetches all document entries from the eDirect platform and writes `index.json`.

Each entry includes:

| Field           | Description                                                  |
|-----------------|--------------------------------------------------------------|
| `id`            | Unique document ID from eDirect                              |
| `institution`   | Full institution name                                        |
| `city`          | Extracted city/town name (if applicable)                     |
| `county`        | Extracted county name (if applicable)                        |
| `localityType`  | `municipiu`, `oras`, `comuna`, `sector`, `judet`, or `null`  |
| `documentName`  | Document title                                               |
| `description`   | Document description (often empty)                           |
| `procedure`     | Administrative procedure this form belongs to                |
| `procedureId`   | Procedure ID on the platform                                 |
| `fileExtension` | `pdf`, `doc`, `docx`, `xlsx`, etc.                           |
| `downloadUrl`   | Full download URL                                            |
| `relativePath`  | Path relative to the eDirect uploads directory               |

### Institution parsing

Institution names like `Primaria Municipiului Cluj-Napoca` or `Consiliul Judetean Brasov` are automatically parsed to extract `city`, `county`, and `localityType`. This makes it easy to filter by location.

## download.mjs

Reads `index.json` and downloads files into `scripts/edirect/downloads/`, organised into folders by institution name.

### Options

| Flag                  | Description                                  | Default |
|-----------------------|----------------------------------------------|---------|
| `--ext pdf`           | Only download files with this extension       | all     |
| `--ext pdf,docx`      | Comma-separated list of extensions           | all     |
| `--dry-run`           | Show what would be downloaded, don't fetch    | off     |
| `--concurrency 5`     | Number of parallel downloads                  | 3       |

### Incremental downloads

Progress is tracked in `download-progress.json`. Re-running the script skips files that were already downloaded. Delete this file to force a full re-download.

### Output structure

```
scripts/edirect/downloads/
├── Primaria Municipiului Constanta/
│   ├── Cerere autorizatie_2694104.docx
│   └── ...
├── Ministerul Agriculturii si Dezvoltarii Rurale/
│   └── ...
└── ...
```

## File type breakdown

As of the last index fetch:

| Extension | Count |
|-----------|-------|
| PDF       | ~3,350 |
| DOCX      | ~2,900 |
| DOC       | ~2,340 |
| XLSX      | ~120   |
| RTF       | ~70    |
| Other     | ~30    |

## Notes

- No authentication is required; all documents are publicly accessible.
- The API requires a session cookie, which `fetch-index.mjs` obtains automatically.
- `index.json`, `downloads/`, and `download-progress.json` are gitignored.
