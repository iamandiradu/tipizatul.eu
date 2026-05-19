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
import concurrent.futures
import json
import subprocess
import sys
import threading
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
    n_deferred_scan = sum(1 for v in completed.values() if v['status'] == 'deferred_scan')
    n_skipped = sum(1 for v in completed.values() if v['status'] == 'skipped')
    n_pending = n_queued - len(completed)
    print(f'Queue size:        {n_queued}')
    deferred = queue.get('deferred_over_cap', queue.get('deferred_over_2mb', 0))
    print(f'Deferred>cap:      {deferred}')
    print(f'Completed:         {n_done}')
    print(f'Failed:            {n_failed}')
    print(f'Deferred scans:    {n_deferred_scan}')
    print(f'Skipped (missing): {n_skipped}')
    print(f'Pending:           {n_pending}')
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
    provider: str, model: str | None,
    vision_model: str | None,
    timeout: float, log_path: Path,
    skip_scans: bool = False,
) -> dict:
    """Classify the PDF and run the appropriate path.

    Born-digital → extract_digital.py (text LLM, fast).
    Scan         → scan_pdf.py (vision LLM, slow).
    Mixed        → extract_digital.py first; if it found < 3 shapes
                   (likely classifier overconfident on a near-scan),
                   fall back to scan_pdf.py.
    """
    from lib.classify import classify
    t0 = time.monotonic()
    cls = classify(str(pdf_path))

    # Cheap escape hatch: when scans are being deferred for later, don't
    # waste GPU time on them. Returns a `deferred_scan` status that the
    # progress file can filter on later when we want to (re-)run them.
    if skip_scans and cls.category == 'scan':
        return {
            'status': 'deferred_scan',
            'elapsed_s': round(time.monotonic() - t0, 1),
            'path': 'skipped',
            'category': cls.category,
        }

    def call(script_name: str, model_override: str | None, extra_args: list[str] | None = None) -> subprocess.CompletedProcess:
        args = [
            sys.executable, str(SCRIPT_DIR / script_name),
            str(pdf_path),
            '--out', str(output_dir),
            '--log', str(log_path),
            '--provider', provider,
            '--timeout', str(timeout),
        ]
        if model_override:
            args.extend(['--model', model_override])
        if extra_args:
            args.extend(extra_args)
        return subprocess.run(args, capture_output=True, text=True)

    if cls.category == 'scan':
        path_used = 'scan'
        proc = call('scan_pdf.py', vision_model)
    else:
        path_used = 'digital'
        proc = call('extract_digital.py', model)
        # Fallback for mixed PDFs that produced few/no fields via the digital
        # path. Disabled when scans are being deferred (no point falling back
        # to a path we're skipping).
        if proc.returncode == 0 and cls.category == 'mixed' and not skip_scans:
            stem = pdf_path.stem
            fjp = output_dir / f'{stem}.fields.json'
            n_fields = 0
            if fjp.exists():
                try:
                    n_fields = len(json.loads(fjp.read_text(encoding='utf-8')).get('fields') or [])
                except Exception:
                    pass
            if n_fields < 3:
                path_used = 'scan-fallback'
                proc = call('scan_pdf.py', vision_model)

    elapsed = time.monotonic() - t0
    if proc.returncode != 0:
        return {
            'status': 'failed',
            'elapsed_s': round(elapsed, 1),
            'path': path_used,
            'category': cls.category,
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
        'path': path_used,
        'category': cls.category,
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
    parser.add_argument('--model', default=None, help='Override text-LLM model (born-digital path)')
    parser.add_argument('--vision-model', default=None,
                        help='Override vision-LLM model (scan path); default: provider vision default')
    parser.add_argument('--timeout', type=float, default=600,
                        help='Per-PDF HTTP timeout in seconds (default 600)')
    parser.add_argument('--status', action='store_true', help='Print status and exit')
    parser.add_argument('--reset', action='store_true', help='Erase progress and exit')
    parser.add_argument('--save-every', type=int, default=1,
                        help='Save progress every N PDFs (default 1)')
    parser.add_argument('--concurrency', type=int, default=1,
                        help='Number of worker threads issuing Ollama '
                             'requests in parallel (default 1). Each thread '
                             'consumes ~1 GB of Ollama KV cache; needs Ollama '
                             'started with OLLAMA_NUM_PARALLEL set to at least '
                             'this value to actually run concurrently.')
    parser.add_argument('--skip-scans', action='store_true',
                        help='Defer pure-scan PDFs (vision LLM path). Useful '
                             'when running at high concurrency — the vision '
                             'model does not parallelise well on a single GPU. '
                             'Skipped PDFs land in the progress file with '
                             'status=deferred_scan so a later run can pick '
                             'them up.')
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
    lock = threading.Lock()
    completed_count = 0   # combined done+failed, for save-cadence + display

    def process_item(item):
        nonlocal new_done, new_failed, completed_count
        pdf_path = Path(item['path'])
        if not pdf_path.is_file():
            res = {'status': 'skipped', 'elapsed_s': 0.0,
                   'error': 'source file missing'}
        else:
            res = run_one(
                pdf_path, output_dir,
                provider=args.provider, model=args.model,
                vision_model=args.vision_model,
                timeout=args.timeout, log_path=log_path,
                skip_scans=args.skip_scans,
            )

        with lock:
            completed[item['path']] = res
            if res['status'] == 'done':
                new_done += 1
            elif res['status'] == 'failed':
                new_failed += 1
            completed_count += 1
            i = completed_count
            status_tags = {'done': '✓', 'skipped': '−', 'deferred_scan': '⏸', 'failed': '✗'}
            tag = status_tags.get(res['status'], '?')
            extras = ''
            if res.get('path'):
                extras += f" via {res['path']}"
            if res.get('fields') is not None:
                extras += f" f={res['fields']} conf={res.get('avg_confidence')}"
            print(f'[{i}/{len(pending)}] {tag} {pdf_path.name[:60]} '
                  f'({res["elapsed_s"]}s{extras})', flush=True)
            if completed_count % max(args.save_every, 1) == 0:
                save_progress(progress)

    concurrency = max(1, int(args.concurrency))
    print(f'Concurrency: {concurrency} worker thread(s)')
    print()
    try:
        if concurrency == 1:
            for item in pending:
                process_item(item)
        else:
            with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
                # Submit all and wait — exceptions surface via the futures.
                futures = [pool.submit(process_item, item) for item in pending]
                for fut in concurrent.futures.as_completed(futures):
                    exc = fut.exception()
                    if exc is not None:
                        print(f'  worker error: {exc}', file=sys.stderr, flush=True)
    except KeyboardInterrupt:
        print('\nInterrupted — saving progress.', flush=True)
    finally:
        with lock:
            save_progress(progress)

    print()
    print(f'This run: {new_done} done, {new_failed} failed')
    print(f'Overall:  {sum(1 for v in completed.values() if v["status"] == "done")} done of {n_total}')
    print(f'Progress saved to {PROGRESS_PATH}')
    return 0 if new_failed == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
