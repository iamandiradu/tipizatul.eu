#!/usr/bin/env python3
"""Build the priority-ordered processing queue for the corpus batch runner.

Walks bundles/ (excluding bundles/processed/), filters PDFs by size
(default cap: 2 MB), groups by normalised stem name to compute
replication count across municipalities, and writes corpus-batch.queue.json
in priority order (most-replicated doc types first, then cheapest size).

Usage:
  python build_corpus_queue.py [--bundles-dir <path>] [--size-cap-mb 2]
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_BUNDLES = SCRIPT_DIR.parent / 'bundles'
DEFAULT_OUT = SCRIPT_DIR / 'corpus-batch.queue.json'


_ID_TAIL_RE = re.compile(r'_\d{4,}$')
_WHITESPACE_RE = re.compile(r'\s+')


def normalise_stem(stem: str) -> str:
    """Lowercase, strip the trailing numeric eDirect id, collapse spaces.

    Two PDFs with the same content but different city/upload IDs end up
    with the same normalised form — that's what makes the replication
    count a useful popularity proxy."""
    norm = _ID_TAIL_RE.sub('', stem).strip().lower()
    return _WHITESPACE_RE.sub(' ', norm)


def main() -> int:
    parser = argparse.ArgumentParser(description='Build the corpus processing queue.')
    parser.add_argument('--bundles-dir', default=str(DEFAULT_BUNDLES),
                        help=f'Where to find source PDFs (default {DEFAULT_BUNDLES})')
    parser.add_argument('--out', default=str(DEFAULT_OUT),
                        help=f'Queue JSON path (default {DEFAULT_OUT})')
    parser.add_argument('--size-cap-mb', type=float, default=2.0,
                        help='Defer PDFs larger than this many MB (default 2.0)')
    parser.add_argument('--exclude-subdir', default='processed',
                        help='Subdir name under bundles/ to exclude (default "processed")')
    args = parser.parse_args()

    bundles_dir = Path(args.bundles_dir).resolve()
    if not bundles_dir.is_dir():
        print(f'bundles dir not found: {bundles_dir}')
        return 1
    size_cap = int(args.size_cap_mb * 1024 * 1024)

    files: list[dict] = []
    counter: Counter = Counter()

    for p in bundles_dir.rglob('*.pdf'):
        if f'/{args.exclude_subdir}/' in str(p):
            continue
        if not p.is_file():
            continue
        size = p.stat().st_size
        norm = normalise_stem(p.stem)
        counter[norm] += 1
        files.append({'path': str(p.resolve()), 'size': size, 'norm': norm})

    kept = [f for f in files if f['size'] <= size_cap]
    deferred = [f for f in files if f['size'] > size_cap]

    for f in kept:
        f['replication'] = counter[f['norm']]
    # Highest replication first; within a group, smallest size first (cheaper).
    kept.sort(key=lambda f: (-f['replication'], f['size']))

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'bundles_dir': str(bundles_dir),
        'size_cap_bytes': size_cap,
        'total_in_corpus': len(files),
        'kept': len(kept),
        'deferred_over_cap': len(deferred),
        'distinct_normalised_names': len(counter),
        'top_doc_types': [
            {'name': n, 'count': c} for n, c in counter.most_common(30)
        ],
        'queue': [{'path': f['path'], 'size': f['size'],
                   'replication': f['replication']} for f in kept],
        'deferred': [{'path': f['path'], 'size': f['size']} for f in deferred],
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                        encoding='utf-8')
    print(f'Wrote {out_path}')
    print(f'  Total: {len(files)} PDFs')
    print(f'  Kept (≤ {args.size_cap_mb} MB): {len(kept)}')
    print(f'  Deferred (> {args.size_cap_mb} MB): {len(deferred)}')
    print(f'  Distinct doc types: {len(counter)}')
    print()
    print('Top 10 most-replicated doc types:')
    for n, c in counter.most_common(10):
        print(f'  {c:>4}× {n[:80]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
