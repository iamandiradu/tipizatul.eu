# LLM field detector

LLM-driven pipelines for detecting fillable fields in Romanian admin
PDFs. Output schema matches
[`paddle/detect_fields.py`](../paddle/detect_fields.py) so the admin
upload page accepts results from any path.

Two extraction routes, three ways to drive the LLM:

| Extractor              | When to use                              | Default driver           |
|------------------------|------------------------------------------|--------------------------|
| `extract_digital.py`   | Born-digital PDFs (has extractable text) | local Ollama (free)      |
| `scan_pdf.py`          | Scans (no extractable text)              | local Ollama vision      |
| `detect.py`            | Dispatcher — classify then route         | both                     |

| Driver                 | What it is                               | Speed (M1)                                 |
|------------------------|------------------------------------------|--------------------------------------------|
| **Local** (`--provider ollama`)        | Ollama on this machine. Free, private.   | text: ~120–240 s/page · vision: ~20 s/page |
| **Chat** (`dump_struct.py` + `chat_apply.py`) | You paste the page structure into a chat window with a strong model (Claude in chat, ChatGPT, etc.), it produces a labels.json file, you apply. Best quality, no API key required. | bounded by chat — ~minutes/page interactively |
| **API** (`--provider anthropic`)       | Direct Anthropic API call. Needs `ANTHROPIC_API_KEY`. Same quality as chat but automated. | ~5–15 s/page |

The local and API drivers can run in **hybrid** mode: local first,
then cloud fills the gaps where local confidence was below threshold.
That keeps the bulk of the corpus free and spends cloud budget only on
hard pages.

## Why two extractors

For a born-digital PDF, PyMuPDF gives us every word's bounding box and
every vector line/rectangle for free. Sending that as compact JSON to a
text-only LLM is much cheaper than rasterising the page and asking a
vision LLM to OCR it back — and more accurate, because the model isn't
guessing at pixels.

For a scan, there is no extractable text. We have to rasterise and use
a vision model.

`detect.py` classifies the input and routes accordingly.

## Which driver to use

- **Just trying this out / small batch** → chat driver. No API costs,
  no Ollama setup beyond what you already have. You're the loop.
- **Large batch (~1k+ PDFs), price-sensitive** → local driver
  (qwen2.5:7b). Accept lower label quality on dense forms — the
  needsReview flag catches them.
- **Large batch, quality-sensitive, have API key** → hybrid
  (`--provider ollama --escalate-below 0.85`). Local does the easy
  fields free; cloud (sonnet-4-6) does the rest.
- **Always-cloud** (`--provider anthropic`) is the fastest but most
  expensive — ~$0.10–$0.45 per page depending on model.

### Cost guidance for the API driver

Per-page cost for the structured-input prompt (~16k input, ~3k output):

| Model               | Per page | Per 1k pages |
|---------------------|---------:|-------------:|
| `claude-haiku-4-5`  | ~$0.03   | ~$30         |
| `claude-sonnet-4-6` | ~$0.10   | ~$100        |
| `claude-opus-4-7`   | ~$0.45   | ~$450        |

Hybrid runs typically escalate 20–30 % of pages on a born-digital
corpus, so the effective cost is roughly a third of the always-cloud
number.

## Prerequisites (M1/M2/M3 Mac)

- macOS 13+ (Ventura or newer).
- The `paddle/` venv already set up — this pipeline reuses it (PyMuPDF
  via PyPI; no new Python deps). See
  [`paddle/README.md`](../paddle/README.md#setup).
- [Ollama](https://ollama.com) **0.24 or newer**, running locally on
  `http://localhost:11434`. Older versions either lack Metal for
  Qwen2.5-VL (vision path becomes CPU-only, ~10× slower) or outright
  crash compiling the compute graph. Check the *server* version with
  `ollama --version`. If the daemon is older than the CLI, restart it:

  ```bash
  brew services restart ollama
  ```

- Models (pull once):

  ```bash
  ollama pull qwen2.5:7b     # text-only, ~4.7 GB — for born-digital path (default)
  ollama pull qwen2.5vl:3b   # vision, ~3.2 GB    — for scan path
  ```

  Faster but less reliable: `qwen2.5:3b` (~1.9 GB) for the text path —
  drops per-page latency to ~60 s but the smaller model echoes the prompt's
  examples instead of doing the task on dense forms. Use `--model qwen2.5:3b`.

  Optional: `qwen2.5vl:7b` (~4.7 GB) for the vision path when 3B isn't
  accurate enough on dense scans.

- (Cloud only) **Anthropic API key**. Export `ANTHROPIC_API_KEY=<your-key>`
  in your shell before running with `--provider anthropic` or
  `--escalate-below`. No SDK is required — `lib/anthropic_client.py`
  talks to `/v1/messages` via `urllib`. Use `--api-key-env=<VAR_NAME>`
  if you store the key in a different env var.

## Activate the venv

```bash
cd scripts/edirect/paddle
source .venv/bin/activate
cd ../llm
```

## Usage

### Chat-driven workflow (no API key required)

This is the path to use when you want Claude/ChatGPT/etc. quality
without an API subscription. The model lives in your chat tab; this
pipeline just relays files in and out.

```bash
# 1. Dump page structure for one PDF or a whole directory.
#    Writes <stem>.struct.json (read by the LLM) and an empty
#    <stem>.labels.json template (filled by the LLM) into ./chat-work/.
python dump_struct.py "../paddle/eval-set/Cerere tip abonament parcare cod PPF_4932313.pdf"
python dump_struct.py --batch ../paddle/eval-set

# 2. Open <stem>.struct.json in your chat session. Ask the model:
#    "Read this and fill in <stem>.labels.json with one entry per shape:
#     {shape_id, type, label, confidence}". Paste the JSON it returns
#    into the labels.json file on disk.

# 3. Apply.
python chat_apply.py --batch ./chat-work --pdf-dir ../paddle/eval-set --out ./output-chat
# Or single-file mode:
python chat_apply.py file.pdf labels.json output.pdf
```

The labels.json schema is:

```json
{
  "fields": [
    {"shape_id": 0, "type": "text",     "label": "CNP",                "confidence": 0.97},
    {"shape_id": 1, "type": "checkbox", "label": "Sunt de acord",       "confidence": 0.92}
  ]
}
```

A shape not present in `labels.json` is still emitted as an unlabelled
fillable blank — partial labels are fine, you don't have to do every
shape in one chat session.

### Dispatcher (corpus run)

```bash
python detect.py path/to/file.pdf
python detect.py --batch ../paddle/eval-set
python detect.py file.pdf --force-digital      # bypass classifier
python detect.py file.pdf --force-scan
# Forward args to the underlying script after `--`:
python detect.py file.pdf -- --dry-run --verbose
```

### Born-digital path (local Ollama)

```bash
python extract_digital.py "../paddle/eval-set/Cerere tip abonament parcare cod PPF_4932313.pdf" --verbose
python extract_digital.py --batch ../paddle/eval-set --dry-run
```

### Born-digital path (Anthropic API — only if you have a key)

```bash
export ANTHROPIC_API_KEY=<your-key>
python extract_digital.py file.pdf --provider anthropic
python extract_digital.py file.pdf --provider anthropic --model claude-haiku-4-5   # cheaper
python extract_digital.py file.pdf --provider anthropic --model claude-opus-4-7    # strongest

# Hybrid: local first, cloud fills in low-confidence shapes
python extract_digital.py --batch ../paddle/eval-set \
  --escalate-below 0.85 --escalate-provider anthropic --escalate-model claude-sonnet-4-6
```

### Scan path

```bash
python scan_pdf.py path/to/scan.pdf --verbose
python scan_pdf.py file.pdf --dpi 200                  # bump for small fonts
python scan_pdf.py file.pdf --provider anthropic       # if you have a key
```

## Common CLI flags

| Flag                  | Default                  | Used by      |
|-----------------------|--------------------------|--------------|
| `<file>`              | —                        | all          |
| `--batch <dir>`       | —                        | `dump_struct`, `chat_apply`, `extract_*`, `scan_*`, `detect` |
| `--out <dir>`         | `./output`               | `extract_*`, `scan_*`, `chat_apply`, `dump_struct` |
| `--log <path>`        | `./detections.log`       | `extract_*`, `scan_*` |
| `--provider`          | `ollama`                 | `extract_*`, `scan_*` |
| `--model <tag>`       | provider default         | `extract_*`, `scan_*`, `chat_apply` |
| `--ollama-host`       | `http://localhost:11434` | `extract_*`, `scan_*` |
| `--api-key-env`       | `ANTHROPIC_API_KEY`      | `extract_*`, `scan_*` |
| `--timeout <s>`       | 300 (digital), 600 (scan)| `extract_*`, `scan_*` |
| `--escalate-below <c>`| off                      | `extract_*` only |
| `--escalate-provider` | `anthropic`              | `extract_*` only |
| `--escalate-model`    | provider default         | `extract_*` only |
| `--escalate-timeout`  | 300                      | `extract_*` only |
| `--pdf-dir <dir>`     | —                        | `chat_apply --batch` only |
| `--dpi <n>`           | 150                      | `scan_*` only |
| `--dry-run`           | off                      | `extract_*`, `scan_*` |
| `--verbose`           | off                      | `extract_*`, `scan_*` |
| `--force-digital`     | off                      | `detect` only |
| `--force-scan`        | off                      | `detect` only |

## Outputs

Both extractors write the same shape:

- `output/<name>.pdf` — fillable AcroForm version, ready to upload.
- `output/<name>.fields.json` — intermediate field list with these
  top-level keys not in the paddle output:
  - `isScan` — true when the source has no extractable text.
  - `needsReview` — true when `avgConfidence < 0.95`, or the source is
    a scan, or zero fields were detected. The 0.95 threshold is on
    purpose stricter than paddle's 0.75 — LLM labels need a closer look.
  - `model`, `extractor` — which path produced this. The extractor
    string also encodes provider, e.g. `llm_digital_ollama`,
    `llm_digital_anthropic`, or `llm_digital_ollama+anthropic` for a
    hybrid run.
  - `cloudUsage` (when cloud was called) — `{provider, inputTokens,
    outputTokens}`. Use to track spend per file.
- Per-field `context` records which driver produced the label:
  `llm_digital` (local primary pass), `escalated_anthropic` (cloud
  fallback in hybrid mode), `chat` (chat-driven label via chat_apply.py),
  `shape_only` (no label, just detected geometry).
- `detections.log` — append-only, same line format as paddle's log so a
  single tail covers everything.

## How confidence is computed

### Digital path
For each shape the model labels, the final confidence is

```
0.7 * model_self_rating + 0.3 * label_credibility
```

where `label_credibility` is the fraction of label tokens that appear
in the PDF's extractable text. Labels with credibility < 0.5 are
dropped entirely (hallucination filter). The shape type is **not**
trusted from the model — it's forced from the shape geometry
(`checkbox` shape → checkbox field, etc.).

### Scan path
Same scheme but `label_credibility` comes from a coarse OCR-token
membership check (most scans have an empty token set, in which case
the path returns 0.5 to avoid double-penalising).

## Known sharp edges

- **`Ollama 0.23` crashes on Qwen2.5-VL** — even loading. Symptom:
  `level=ERROR ... msg="llama runner terminated" error="exit status 2"`
  in `/opt/homebrew/var/log/ollama.log`. Fix: `brew services restart ollama`.
- **`num_ctx` defaults to 4096** — too small for our prompts (a dense
  page is 4k–12k tokens). We override to 16384; if you see a server-log
  line `msg="truncating input prompt" limit=...`, bump higher.
- **Recall vs label quality tradeoff** — the digital path currently
  labels every candidate shape (high recall) but ~25% of labels are
  rejected as hallucinated. Those shapes still write as fields, just
  with no label; they get a needsReview flag.
- **Multi-page scans are slow** — a 4-page born-digital ghid runs ~5 min
  on M1 (3B model, 60 s/page baseline). A 4-page scan can take 15+ min
  in vision mode. For batch runs, plan for ~20 min per 10 files.

## Troubleshooting

**`Connection refused: localhost:11434`** — start Ollama, or
`brew services start ollama`.

**`model 'X' not found`** — `ollama pull X`.

**Model output isn't valid JSON** — we ask for JSON mode and tolerate
fences/preamble; on parse failure we log and skip the page. Check
`detections.log` for the raw context.

**Coordinates look offset (scan path)** — the LLM is asked for
normalised (0–1) bboxes. Increase `--dpi` from 150 to 200 if you see
systematic 1–2 pt errors on small fonts.

**Inference hangs forever** — `tail /opt/homebrew/var/log/ollama.log`.
The two common causes are (a) compute-graph crashes on outdated
Ollama, (b) `truncating input prompt` warnings followed by the model
generating nonsense from a chopped-off prompt. Both go away on Ollama
0.24+ with `num_ctx=16384`.
