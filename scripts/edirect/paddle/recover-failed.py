#!/usr/bin/env python3
"""Recover the AcroForm PDFs for files where detect_fields.py wrote a
fields.json but the Node writer (apply-fields.mjs) crashed mid-write.

Strategy: PyMuPDF parses lenient PDFs that pdf-lib chokes on. We re-save
the source PDF via PyMuPDF (deflate + clean + garbage collect), which
canonicalises its structure, then re-invoke the Node writer against the
cleaned copy.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import fitz


SCRIPT_DIR = Path(__file__).resolve().parent
NODE_WRITER = SCRIPT_DIR.parent / 'apply-fields.mjs'


def find_unpaired_jsons(output_root: Path) -> list[Path]:
    """fields.json files that don't have a matching <stem>.pdf next to them."""
    out: list[Path] = []
    for json_path in output_root.rglob('*.fields.json'):
        pdf_path = json_path.with_name(json_path.stem.replace('.fields', '') + '.pdf')
        # json_path.stem strips only the last .json, leaving "<name>.fields"
        sibling_pdf = json_path.parent / f'{json_path.stem.replace(".fields", "")}.pdf'
        if not sibling_pdf.is_file():
            out.append(json_path)
    return out


def find_source_pdf(json_path: Path, bundles_root: Path) -> Path | None:
    """Locate the original PDF in bundles/. The fields.json sits at
    output/bundle-N/<stem>.fields.json; the source is at bundles/N/.../<stem>.pdf"""
    stem = json_path.stem.replace('.fields', '')
    bundle_dir_name = json_path.parent.name.replace('bundle-', '')
    bundle_root = bundles_root / bundle_dir_name
    if not bundle_root.is_dir():
        return None
    matches = list(bundle_root.rglob(f'{stem}.pdf'))
    return matches[0] if matches else None


def repair_pdf(src: Path, dst: Path) -> None:
    doc = fitz.open(str(src))
    try:
        doc.save(str(dst), deflate=True, clean=True, garbage=4)
    finally:
        doc.close()


def run_node_writer(src_pdf: Path, json_path: Path, out_pdf: Path) -> tuple[bool, str]:
    if not NODE_WRITER.exists():
        return False, f'Node writer missing: {NODE_WRITER}'
    result = subprocess.run(
        ['node', str(NODE_WRITER), str(src_pdf), str(json_path), str(out_pdf)],
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        return True, result.stdout.strip()
    return False, (result.stderr or result.stdout).strip()[:300]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--output-root', default=str(SCRIPT_DIR / 'output'),
                    help='Where bundle-N/ subdirs live')
    ap.add_argument('--bundles-root', default=str(SCRIPT_DIR.parent / 'bundles'),
                    help='Where the source PDF bundles live')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    output_root = Path(args.output_root).resolve()
    bundles_root = Path(args.bundles_root).resolve()

    unpaired = find_unpaired_jsons(output_root)
    print(f'Found {len(unpaired)} fields.json files without a paired AcroForm PDF.')
    if not unpaired:
        return 0

    recovered = retried = missing_source = failed = 0
    for json_path in unpaired:
        bundle = json_path.parent.name
        rel = json_path.name
        src = find_source_pdf(json_path, bundles_root)
        if src is None:
            missing_source += 1
            print(f'  [{bundle}] MISSING SOURCE  {rel}')
            continue

        if args.dry_run:
            print(f'  [{bundle}] would retry      {rel}  (source: {src.relative_to(bundles_root.parent)})')
            continue

        retried += 1
        out_pdf = json_path.with_name(f'{json_path.stem.replace(".fields", "")}.pdf')

        # First try without repair, in case the failure was transient.
        ok, msg = run_node_writer(src, json_path, out_pdf)
        if ok:
            recovered += 1
            print(f'  [{bundle}] OK (no repair)   {rel}')
            continue

        # Failed → rewrite via PyMuPDF and retry.
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            repair_pdf(src, tmp_path)
            ok2, msg2 = run_node_writer(tmp_path, json_path, out_pdf)
            if ok2:
                recovered += 1
                print(f'  [{bundle}] OK (after repair){rel}')
            else:
                failed += 1
                print(f'  [{bundle}] FAIL              {rel}: {msg2[:200]}', file=sys.stderr)
        finally:
            tmp_path.unlink(missing_ok=True)

    print()
    print(f'Recovered: {recovered}/{retried}, source missing: {missing_source}, '
          f'still failing: {failed}')
    return 0 if failed == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
