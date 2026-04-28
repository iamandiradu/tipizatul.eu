# Paddle field detector (Apple Silicon)

PaddleOCR + OpenCV pipeline that reads a flat PDF, finds the form fields
(dot/underscore leaders, underline rectangles, checkboxes), and writes a
fillable AcroForm PDF that the tipizatul.eu admin upload page can read.

The AcroForm writing reuses the existing Node module
[`scripts/edirect/lib/acroform-writer.mjs`](../lib/acroform-writer.mjs) via
[`scripts/edirect/apply-fields.mjs`](../apply-fields.mjs), so the produced
PDFs are bit-identical in form structure to anything `detect-fields.mjs`
already emits — only the *detection* is replaced.

## Why this exists

`detect-fields.mjs` (the pure-JS version) detects fields from a hand-rolled
content-stream parser. On dense Romanian admin forms it over-fires on
decorative dots and produces noisy labels (4/5 sample PDFs landed in
`needs-review/`). PaddleOCR + pixel-level shape detection is much closer
to ground truth on the same documents.

## Prerequisites (M1/M2/M3 Mac)

- macOS 13+ (Ventura or newer)
- Python 3.10 or 3.11 — **avoid 3.12+**, paddlepaddle 2.x has no wheels yet
- Node 18+ (already required for the rest of `scripts/edirect/`)
- ~2 GB free disk (PaddleOCR models + venv)

The recommended Python install is via Homebrew:

```bash
brew install python@3.11
```

## Setup

```bash
cd scripts/edirect/paddle

python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

First run will additionally download ~50 MB of PaddleOCR models to
`~/.paddleocr/` (det + rec + angle classifier). That's a one-time cost.

Make sure the Node side has its deps installed too (it almost certainly does
already if you've been running `detect-fields.mjs`):

```bash
cd ../../..      # repo root
npm install
cd scripts/edirect/paddle
```

## Usage

Single file:

```bash
python detect_fields.py ../test-samples/test1_cerere_primarie.pdf --verbose
```

Batch the whole `test-samples/` directory:

```bash
python detect_fields.py --batch ../test-samples
```

Dry run — detect and print, write nothing:

```bash
python detect_fields.py --batch ../test-samples --dry-run --verbose
```

Higher resolution (slower, often more accurate on small fonts):

```bash
python detect_fields.py ../test-samples/test3_consiliu.pdf --dpi 250
```

### Options

| Flag         | Default              | Description                              |
|--------------|----------------------|------------------------------------------|
| `<file>`     | —                    | Single PDF to process                     |
| `--batch`    | —                    | Recurse this directory for `*.pdf`        |
| `--out`      | `./output`           | Where to write `*.pdf` and `*.fields.json`|
| `--log`      | `./detections.log`   | Append-only run log (per-field rows)      |
| `--dpi`      | `200`                | Render DPI                                |
| `--dry-run`  | off                  | Detect only, don't write PDFs             |
| `--verbose`  | off                  | Print every field to stdout               |

## Outputs

- `output/<name>.pdf` — fillable AcroForm version, ready to upload to the
  admin page on tipizatul.eu.
- `output/<name>.fields.json` — intermediate field list handed to the Node
  writer. Useful for debugging coordinates without re-running OCR.
- `detections.log` — single text file appended on every run. Per file:
  pages, field count, average confidence, status, and one line per field
  with type, source heuristic, page, rect, label, and confidence.

A run is flagged `NEEDS_REVIEW` in the log when the average field
confidence falls below `0.75` (constant `CONFIDENCE_THRESHOLD` in
`detect_fields.py`).

## How it works

1. **Render** — PyMuPDF rasterises each page at the chosen DPI (default 200).
2. **OCR** — PaddleOCR (`lang='ro'`, the Latin recognizer) returns text
   items with axis-aligned bboxes and per-item confidence.
3. **Shape detect** — OpenCV finds horizontal underline rectangles
   (morphological opening with a wide kernel) and small empty squares
   (contour scan + interior fill ratio check).
4. **Field assemble** — OCR items whose content is mostly `.` or `_`
   become text fields directly. Visual underlines and squares contribute
   the rest. Overlapping detections are deduped.
5. **Label association** — for each field, find the closest readable OCR
   item to the left on the same line, falling back to the nearest item
   above with horizontal overlap.
6. **Coordinate conversion** — image pixels (top-left origin) → PDF points
   (bottom-left origin) using the page's actual height in points.
7. **AcroForm write** — JSON shipped to `node ../apply-fields.mjs`, which
   runs labels through `romanian-patterns.mjs` (CNP / date / email / IBAN /
   etc. for type hints + placeholders), then calls
   `lib/acroform-writer.mjs` to embed the fields.

## Troubleshooting

**`paddleocr` install fails with "no matching distribution"** — almost
always Python 3.12 or 3.13. Recreate the venv with 3.11.

**First run is very slow** — model download. Subsequent runs are 1–3 s
per page on M1 Pro.

**`Error: paddle is not installed`** — the venv isn't activated. Run
`source .venv/bin/activate` again.

**Node writer fails with "fontkit"** — outside the scope of this script;
that's a `pdf-lib` issue handled in the main app's `pdf-fill.ts`. Fields
are still written correctly — opening the PDF in Acrobat will confirm.

**OCR misreads diacritics (ș / ț / ă)** — bump `--dpi` to 250 or 300. The
Latin recogniser needs ~10 px per glyph; below that it confuses ț with t.

**A run is flagged NEEDS_REVIEW but the fields look fine in Acrobat** —
the threshold is conservative (`0.75`). Adjust `CONFIDENCE_THRESHOLD` in
`detect_fields.py` if you want to be stricter / looser; the field
detection itself doesn't change.
