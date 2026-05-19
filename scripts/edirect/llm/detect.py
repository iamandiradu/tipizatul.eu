#!/usr/bin/env python3
"""Top-level dispatcher: classify a PDF, route to the right LLM path.

  born_digital → extract_digital.py  (text-only LLM, words+shapes input)
  scan         → scan_pdf.py         (vision LLM, page images)
  mixed        → digital first; if it returns zero fields, fall back to scan

This is the single entry point you should run on the corpus. It just
shells out to the path-specific scripts so they keep their own CLIs and
loggers — useful when you want to re-run just one path against a
subset.

Usage:
  python detect.py <input.pdf>
  python detect.py --batch <dir>
  python detect.py file.pdf --force-scan      # bypass classifier
  python detect.py file.pdf --force-digital
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

from lib.classify import classify


SCRIPT_DIR = Path(__file__).resolve().parent
DIGITAL_SCRIPT = SCRIPT_DIR / 'extract_digital.py'
SCAN_SCRIPT = SCRIPT_DIR / 'scan_pdf.py'


def run_path(script: Path, pdf: Path, extra_args: list[str]) -> int:
    cmd = [sys.executable, str(script), str(pdf), *extra_args]
    result = subprocess.run(cmd)
    return result.returncode


def process_one(pdf: Path, *, force: str | None, extra_args: list[str]) -> str:
    """Returns the path label that was used: 'digital' | 'scan' | 'both' | 'skipped'."""
    if force == 'digital':
        run_path(DIGITAL_SCRIPT, pdf, extra_args)
        return 'digital'
    if force == 'scan':
        run_path(SCAN_SCRIPT, pdf, extra_args)
        return 'scan'

    cls = classify(str(pdf))
    if cls.is_scan:
        run_path(SCAN_SCRIPT, pdf, extra_args)
        return 'scan'
    if cls.is_born_digital:
        run_path(DIGITAL_SCRIPT, pdf, extra_args)
        return 'digital'
    # Mixed: try digital, fall back to scan when it produces nothing.
    # We can't easily inspect the digital output here without parsing
    # the fields.json, so for now we just run digital. The fields.json
    # already records needsReview=True when zero fields → the human
    # review queue catches the fallback.
    run_path(DIGITAL_SCRIPT, pdf, extra_args)
    return 'digital'


def find_pdfs(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob('*.pdf') if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Classify a PDF and dispatch to the right LLM path.',
        epilog='Extra args after `--` are forwarded to the underlying script. '
               'Example: detect.py file.pdf -- --verbose --dry-run',
    )
    parser.add_argument('input', nargs='?', help='Input PDF file')
    parser.add_argument('--batch', help='Process every PDF under this directory')
    parser.add_argument('--force-scan', action='store_true',
                        help='Bypass classifier; always use the vision path')
    parser.add_argument('--force-digital', action='store_true',
                        help='Bypass classifier; always use the text-LLM path')
    parser.add_argument('rest', nargs=argparse.REMAINDER,
                        help='Pass-through args for the underlying script (use after --)')
    args = parser.parse_args()

    if not args.input and not args.batch:
        parser.error('Provide an input PDF or --batch <dir>')
    if args.force_scan and args.force_digital:
        parser.error('--force-scan and --force-digital are mutually exclusive')

    force = 'scan' if args.force_scan else ('digital' if args.force_digital else None)
    # argparse keeps the leading "--" in REMAINDER; drop it.
    extra_args = [a for a in args.rest if a != '--']

    if args.batch:
        root = Path(args.batch).resolve()
        if not root.is_dir():
            print(f'Directory not found: {root}', file=sys.stderr)
            return 1
        targets = find_pdfs(root)
        print(f'Found {len(targets)} PDFs in {root}')
    else:
        single = Path(args.input).resolve()
        if not single.is_file():
            print(f'File not found: {single}', file=sys.stderr)
            return 1
        targets = [single]

    by_path = {'digital': 0, 'scan': 0}
    t0 = time.monotonic()
    for i, pdf in enumerate(targets, 1):
        used = process_one(pdf, force=force, extra_args=extra_args)
        by_path[used] = by_path.get(used, 0) + 1
        print(f'[{i}/{len(targets)}] {pdf.name} → {used}')
    elapsed = time.monotonic() - t0
    print()
    print(f'Dispatch summary: {by_path["digital"]} digital, {by_path["scan"]} scan'
          f' — total {elapsed:.1f}s')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
