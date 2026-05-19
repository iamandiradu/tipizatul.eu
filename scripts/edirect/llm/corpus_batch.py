#!/usr/bin/env python3
"""Process the bundles/ corpus through the LLM pipeline, resumeably.

Reads `corpus-batch.queue.json` (produced by build_corpus_queue.py),
filters to PDFs ≤ 2 MB ordered by replication frequency (most popular
doc types first), and processes each by shelling out to
`extract_digital.py`. State is recorded in `corpus-batch.progress.json`
so the script can resume after Ctrl-C / crash / power loss.

Each PDF's output lands in `output-corpus/<stem>.pdf` and
`output-corpus/<stem>.fields.json`. The progress file records, per
PDF, status (`done` | `failed` | `skipped`), elapsed seconds, fields
detected, avg confidence, and the failure reason if applicable.

Usage:
  python corpus_batch.py
  python corpus_batch.py --limit 50          # only do first 50
  python corpus_batch.py --provider anthropic  # if you ever get a key
  python corpus_batch.py --status            # print current progress + exit
  python corpus_batch.py --reset             # clear progress and start over
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
QUEUE_PATH = SCRIPT_DIR / 'corpus-batch.queue.json'
PROGRESS_PATH = SCRIPT_DIR / 'corpus-batch.progress.json'
DEFAULT_OUT = SCRIPT_DIR / 'output-corpus'
DEFAULT_LOG = SCRIPT_DIR / 'corpus-batch.log'
DETECT_SCRIPT = SCRIPT_DIR / 'detect.py'


def load_queue() -> dict:
    if not QUEUE_PATH.exists():
        print(f'Queue file not found: {QUEUE_PATH}', file=sys.stderr)
        print('Run build_corpus_queue.py first.', file=sys.stderr)
        sys.exit(1)
    return json.loads(QUEUE_PATH.read_text(encoding='utf-8'))


def load_progress() -> dict:
    if not PROGRESS_PATH.exists():
        return {'completed': {}, 'started_at': None}
    return json.loads(PROGRESS_PATH.read_text(encoding='utf-8'))


def save_progress(progress: dict) -> None:
    tmp = PROGRESS_PATH.with_suffix('.tmp')
    tmp.write_text(json.dumps(progress, ensure_ascii=False, indent=2),
                   encoding='utf-8')
    tmp.replace(PROGRESS_PATH)


def print_status() -> int:
    queue = load_queue()
    progress = load_progress()
    completed = progress.get('completed', {})
    n_queued = len(queue['queue'])
    n_done = sum(1 for v in completed.values() if v['status'] == 'done')
    n_failed = sum(1 for v in completed.values() if v['status'] == 'failed')
    n_pending = n_queued - len(completed)
    print(f'Queue size:    {n_queued}')
    deferred = queue.get('deferred_over_cap', queue.get('deferred_over_2mb', 0))
    print(f'Deferred>cap:  {deferred}')
    print(f'Completed:     {n_done}')
    print(f'Failed:        {n_failed}')
    print(f'Pending:       {n_pending}')
    if n_done:
        elapsed = sum(v.get('elapsed_s', 0) for v in completed.values())
        avg = elapsed / n_done
        print(f'Avg time/PDF:  {avg:.0f}s')
        if n_pending:
            eta_hours = avg * n_pending / 3600
            print(f'ETA pending:   {eta_hours:.1f} h ({eta_hours/24:.1f} days)')
    return 0


def reset_progress() -> int:
    if PROGRESS_PATH.exists():
        PROGRESS_PATH.unlink()
        print(f'Removed {PROGRESS_PATH}')
    else:
        print('No progress file to remove.')
    return 0


def run_one(
    pdf_path: Path, output_dir: Path, *,
    provider: str, model: str | None, timeout: float, log_path: Path,
) -> dict:
    """Run extract_digital.py on one PDF; return a result dict."""
    t0 = time.monotonic()
    args = [
        sys.executable, str(SCRIPT_DIR / 'extract_digital.py'),
        str(pdf_path),
        '--out', str(output_dir),
        '--log', str(log_path),
        '--provider', provider,
        '--timeout', str(timeout),
    ]
    if model:
        args.extend(['--model', model])

    proc = subprocess.run(args, capture_output=True, text=True)
    elapsed = time.monotonic() - t0
    if proc.returncode != 0:
        return {
            'status': 'failed',
            'elapsed_s': round(elapsed, 1),
            'error': (proc.stderr or proc.stdout)[-2000:],
        }

    # Read the produced fields.json to surface field count + avg confidence.
    stem = pdf_path.stem
    fjp = output_dir / f'{stem}.fields.json'
    fields_count = None
    avg_conf = None
    needs_review = None
    if fjp.exists():
        try:
            fj = json.loads(fjp.read_text(encoding='utf-8'))
            fields_count = len(fj.get('fields') or [])
            avg_conf = round(fj.get('avgConfidence') or 0.0, 3)
            needs_review = fj.get('needsReview')
        except Exception:
            pass

    return {
        'status': 'done',
        'elapsed_s': round(elapsed, 1),
        'fields': fields_count,
        'avg_confidence': avg_conf,
        'needs_review': needs_review,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Corpus batch runner (size-filtered, resumable).')
    parser.add_argument('--limit', type=int, default=None,
                        help='Process at most N more PDFs and exit.')
    parser.add_argument('--out', default=str(DEFAULT_OUT), help='Output dir')
    parser.add_argument('--log', default=str(DEFAULT_LOG), help='Per-file log path')
    parser.add_argument('--provider', choices=['ollama', 'anthropic'], default='ollama')
    parser.add_argument('--model', default=None, help='Override provider default model')
    parser.add_argument('--timeout', type=float, default=600,
                        help='Per-PDF HTTP timeout in seconds (default 600)')
    parser.add_argument('--status', action='store_true', help='Print status and exit')
    parser.add_argument('--reset', action='store_true', help='Erase progress and exit')
    parser.add_argument('--save-every', type=int, default=1,
                        help='Save progress every N PDFs (default 1)')
    args = parser.parse_args()

    if args.status:
        return print_status()
    if args.reset:
        return reset_progress()

    queue_data = load_queue()
    progress = load_progress()
    if progress.get('started_at') is None:
        progress['started_at'] = time.time()
    completed: dict = progress.setdefault('completed', {})

    output_dir = Path(args.out).resolve()
    log_path = Path(args.log).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    pending = [q for q in queue_data['queue'] if q['path'] not in completed]
    n_total = len(queue_data['queue'])
    n_done_before = len(completed)
    print(f'Queue: {n_total} | already completed: {n_done_before} | pending: {len(pending)}')
    if args.limit:
        pending = pending[:args.limit]
        print(f'Limit applied: processing up to {len(pending)} this run')
    print()

    new_done = new_failed = 0
    t_run_start = time.monotonic()
    try:
        for i, item in enumerate(pending, 1):
            pdf_path = Path(item['path'])
            if not pdf_path.is_file():
                completed[item['path']] = {
                    'status': 'skipped',
                    'elapsed_s': 0.0,
                    'error': 'source file missing',
                }
                continue

            res = run_one(
                pdf_path, output_dir,
                provider=args.provider, model=args.model,
                timeout=args.timeout, log_path=log_path,
            )
            completed[item['path']] = res
            if res['status'] == 'done':
                new_done += 1
            else:
                new_failed += 1

            elapsed_run = time.monotonic() - t_run_start
            rate = (new_done + new_failed) / elapsed_run if elapsed_run > 0 else 0
            tag = '✓' if res['status'] == 'done' else '✗'
            extras = ''
            if res.get('fields') is not None:
                extras = f" f={res['fields']} conf={res.get('avg_confidence')}"
            print(f'[{i}/{len(pending)}] {tag} {pdf_path.name[:70]} '
                  f'({res["elapsed_s"]}s{extras})')

            if i % max(args.save_every, 1) == 0:
                save_progress(progress)
    except KeyboardInterrupt:
        print('\nInterrupted — saving progress.')
    finally:
        save_progress(progress)

    print()
    print(f'This run: {new_done} done, {new_failed} failed')
    print(f'Overall:  {sum(1 for v in completed.values() if v["status"] == "done")} done of {n_total}')
    print(f'Progress saved to {PROGRESS_PATH}')
    return 0 if new_failed == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
