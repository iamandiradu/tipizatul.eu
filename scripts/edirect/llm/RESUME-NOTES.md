# Corpus run — resume notes

State as of 2026-05-21 (corpus_batch is paused).

## Branch

This branch (`llm/local-batch-pipeline`, previously `llm/10-num-ctx-tune`)
consolidates the full local-LLM pipeline. It contains all 10 commits
from the original `llm/01..10` stacked-PR series and a merge of
`feat/procedures-editable-filter` (which had already landed on `main` via
PR #37).

`origin/main` is 1 commit ahead of where this branch's LLM commits were
based; the merge brought that in. The previous stack of PRs (#28–#36) is
**still open on GitHub** and each PR still points at the OLD chain
(`#29` targets `llm/01`, `#30` targets `llm/02`, etc.). They were not
closed and not landed. If the LLM work needs to reach `main`, either (a)
close them all and open one PR from this branch, or (b) reland them in
order through their stack — bypassing the REVIEW_REQUIRED protection on
`main` requires `--admin`.

## Corpus run

| field | value |
|---|---|
| Queue (`corpus-batch.queue.json`) | `--order size`, `--size-floor-mb 0`, `--size-cap-mb 10000` — every PDF in `bundles/`, smallest first |
| Total in queue | 8,272 |
| Done | 1,142 (mean avg-confidence 0.750; 99 % flagged `needsReview` because the LLM threshold is 0.95) |
| Dedup-skipped | 1,262 |
| Pending | 5,868 |
| Failed | 0 |
| Avg time/PDF (running mean) | ~102 s |

`corpus-batch.progress.json` is the source of truth. A pre-restart
safety copy is at `corpus-batch.progress.json.bak`.

The queue was originally a 1–2 MB band ordered by replication; expanded
mid-session to all sizes and reordered smallest-first so
throughput-per-hour is maximised early.

## How to resume

```bash
brew services start ollama        # daemon must be running on :11434
cd scripts/edirect/llm
nohup ../paddle/.venv/bin/python corpus_batch.py --dedup --max-shapes 0 \
  > corpus-batch.run.out 2>&1 &
disown
```

`corpus_batch` checkpoints after each PDF. The PDF that was in-flight
when the process was killed (~#2247 in the run-relative counter) gets
re-attempted on resume.

- `--dedup` is mandatory or the 1,262 fingerprinted duplicates rerun.
- `--max-shapes 0` disables the density cap so dense forms stay in.
- **Do not** pass `--skip-scans` — the smallest-first queue mixes scans
  in by file size; `corpus_batch.run_one` routes them to `scan_pdf.py`
  automatically.
- **Do not** pass `--concurrency 2` on this M1 — see the lesson below.

## Lessons from this run

### Concurrency 2 reduces throughput on this M1 with qwen2.5:7b

Set `OLLAMA_NUM_PARALLEL=2` and ran `--concurrency 2`. Per-PDF time went
from ~334 s (c=1 baseline) to 1,248–3,272 s on individual PDFs. Net
throughput dropped.

Cause: two concurrent KV-cache slots at `num_ctx=16384` + the 7.6 B
model weights (~4.3 GB after Q4_K_M + q8_0 KV) crowd the 8 GB Metal heap
on this M1 Pro. Ollama silently pages part of the active model out of
VRAM, so each request runs partly on the CPU. The earlier `num_ctx`
32 K → 16 K rollback in `381330b6` was the same memory ceiling on the
other axis.

If parallelism is wanted later: swap to `qwen2.5:3b` (~1.9 GB) and run
`--concurrency 3` with `OLLAMA_NUM_PARALLEL=3`. Validate on ~20 PDFs
first.

### Smallest-first queue order matters a lot

Reordering from replication-first to size-first (`--order size` flag on
`build_corpus_queue.py`) dropped the running-mean PDF time from ~545 s
(legacy outliers + dense forms first) to ~102 s within a few thousand
PDFs. The lesson is broader than just this run: when the queue has a
heavy tail of slow items, putting the fast ones first dramatically
improves the rate at which results materialise — even though end-to-end
total work is unchanged.

## What lives in non-git state

- `corpus-batch.queue.json` — current queue.
- `corpus-batch.progress.json` — per-PDF status + fingerprint dict.
- `corpus-batch.progress.json.bak` — pre-restart safety copy.
- `corpus-batch.log` — append-only per-shape detection log.
- `corpus-batch.run.out` — stdout of the most recent run.
- `output-corpus/<stem>.fields.json` + `output-corpus/<stem>.pdf` — the
  upload-ready artefacts (494 files at pause).

All of the above are gitignored.

## Cloud-LLM half (not started)

Plan was to route the ~8 K PDFs outside the 1–2 MB band through the
Anthropic API (sonnet-4-6) in parallel with local. Never started — no
`ANTHROPIC_API_KEY` was available. The smallest-first queue absorbs all
those PDFs into the local run instead.

If a key shows up later and you want to split the work:

```bash
ANTHROPIC_API_KEY=… \
  ../paddle/.venv/bin/python corpus_batch.py \
  --dedup --max-shapes 0 \
  --provider anthropic --model claude-sonnet-4-6
```

Use a separate progress file (or a slice of the queue) so two processes
don't race on `corpus-batch.progress.json`.
