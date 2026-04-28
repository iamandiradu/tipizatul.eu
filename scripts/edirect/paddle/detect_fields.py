#!/usr/bin/env python3
"""Detect form fields in static PDFs using PaddleOCR + OpenCV, then write
fillable AcroForm PDFs by handing off to the existing Node writer.

Usage:
  python detect_fields.py <input.pdf>
  python detect_fields.py --batch <dir>
  python detect_fields.py <input.pdf> --dpi 250 --verbose
  python detect_fields.py --batch <dir> --dry-run

Outputs:
  ./output/<name>.pdf            — AcroForm-fillable PDF
  ./output/<name>.fields.json    — intermediate field list (passed to Node writer)
  ./detections.log               — append-only run log
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from lib.coords import px_to_pt
from lib.field_assemble import RawField, assemble_fields
from lib.paddle_ocr import ocr_image
from lib.pdf_render import render_pdf
from lib.shape_detect import detect_shapes


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPT_DIR / 'output'
DEFAULT_LOG = SCRIPT_DIR / 'detections.log'
NODE_WRITER = SCRIPT_DIR.parent / 'apply-fields.mjs'

CONFIDENCE_THRESHOLD = 0.75   # below this, a PDF is flagged for review in the log


def process_file(pdf_path: Path, output_dir: Path, dpi: int, verbose: bool, dry_run: bool) -> dict:
    t0 = time.monotonic()
    pages = render_pdf(str(pdf_path), dpi=dpi)

    all_fields_json: list[dict] = []
    all_raw: list[tuple[int, RawField, float, float]] = []

    for page in pages:
        text_items = ocr_image(page.image_bgr)
        shapes = detect_shapes(page.image_bgr)
        raw_fields = assemble_fields(text_items, shapes)

        for f in raw_fields:
            x_pt, y_pt, w_pt, h_pt = px_to_pt(
                f.x, f.y, f.w, f.h,
                scale=page.scale,
                page_height_pt=page.height_pt,
            )
            all_raw.append((page.page_index, f, w_pt, h_pt))
            all_fields_json.append({
                'type': f.kind,
                'page': page.page_index,
                'x': round(x_pt, 2),
                'y': round(y_pt, 2),
                'width': round(w_pt, 2),
                'height': round(h_pt, 2),
                'label': f.label,
                'confidence': round(f.confidence, 3),
                'context': f.source,
                'detectionConfidence': round(f.detection_conf, 3),
                'labelConfidence': round(f.label_conf, 3),
            })

    avg_conf = (sum(f['confidence'] for f in all_fields_json) / len(all_fields_json)
                if all_fields_json else 0.0)
    elapsed = time.monotonic() - t0

    summary = {
        'source': str(pdf_path),
        'pages': len(pages),
        'fields_detected': len(all_fields_json),
        'avg_confidence': round(avg_conf, 3),
        'elapsed_seconds': round(elapsed, 2),
        'output_pdf': None,
        'fields': all_fields_json,
    }

    if verbose:
        _print_verbose(pdf_path, summary, all_raw)

    if dry_run or not all_fields_json:
        return summary

    # Write JSON, then hand off to Node writer.
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem
    json_path = output_dir / f'{stem}.fields.json'
    out_pdf = output_dir / f'{stem}.pdf'

    json_path.write_text(json.dumps({
        'source': str(pdf_path),
        'avgConfidence': avg_conf,
        'fields': all_fields_json,
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    _invoke_node_writer(pdf_path, json_path, out_pdf)
    summary['output_pdf'] = str(out_pdf)
    return summary


def _invoke_node_writer(pdf_path: Path, json_path: Path, out_pdf: Path) -> None:
    if not NODE_WRITER.exists():
        raise FileNotFoundError(f'Node writer not found: {NODE_WRITER}')
    result = subprocess.run(
        ['node', str(NODE_WRITER), str(pdf_path), str(json_path), str(out_pdf)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stdout)
        sys.stderr.write(result.stderr)
        raise RuntimeError(f'Node writer failed for {pdf_path}: exit {result.returncode}')


def _print_verbose(pdf_path: Path, summary: dict, raw: list) -> None:
    print(f'  File: {pdf_path}')
    print(f'  Pages: {summary["pages"]}, fields: {summary["fields_detected"]}, '
          f'avg conf: {summary["avg_confidence"]:.2f}, elapsed: {summary["elapsed_seconds"]:.1f}s')
    for f in summary['fields']:
        label = f['label'] or '(no label)'
        print(f'    [{f["context"]:18}] {f["type"]:8} "{label[:60]}" '
              f'page {f["page"]} ({f["x"]:.0f},{f["y"]:.0f}) '
              f'{f["width"]:.0f}x{f["height"]:.0f} '
              f'conf={f["confidence"]:.2f}')


def append_log(log_path: Path, summary: dict) -> None:
    """Append a human-readable record of this run to a single growing .txt log."""
    lines: list[str] = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    status = 'PROCESSED' if summary['avg_confidence'] >= CONFIDENCE_THRESHOLD else 'NEEDS_REVIEW'
    if summary['fields_detected'] == 0:
        status = 'NO_FIELDS'

    lines.append('=' * 80)
    lines.append(f'[{ts}] {summary["source"]}')
    lines.append(f'  Pages: {summary["pages"]} | Fields: {summary["fields_detected"]} | '
                 f'Avg confidence: {summary["avg_confidence"]:.3f} | '
                 f'Status: {status} | Elapsed: {summary["elapsed_seconds"]:.1f}s')
    if summary.get('output_pdf'):
        lines.append(f'  Output: {summary["output_pdf"]}')

    for i, f in enumerate(summary['fields'], 1):
        label = f['label'] or '(no label)'
        lines.append(
            f'  [{i:03d}] {f["type"]:8} | conf={f["confidence"]:.2f} | '
            f'src={f["context"]:18} | page={f["page"]} | '
            f'rect=({f["x"]:.0f},{f["y"]:.0f},{f["width"]:.0f}x{f["height"]:.0f}) | '
            f'label="{label[:80]}"'
        )
    lines.append('')

    with log_path.open('a', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')


def find_pdfs(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob('*.pdf') if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description='Detect form fields in PDFs.')
    parser.add_argument('input', nargs='?', help='Input PDF file')
    parser.add_argument('--batch', help='Process every PDF under this directory (recursive)')
    parser.add_argument('--out', default=str(DEFAULT_OUTPUT), help='Output directory')
    parser.add_argument('--log', default=str(DEFAULT_LOG), help='Append-only log path')
    parser.add_argument('--dpi', type=int, default=200, help='Render DPI (default 200)')
    parser.add_argument('--dry-run', action='store_true', help="Detect but don't write")
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    if not args.input and not args.batch:
        parser.error('Provide an input PDF or --batch <dir>')

    output_dir = Path(args.out).resolve()
    log_path = Path(args.log).resolve()

    targets: list[Path]
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

    processed = review = empty = failed = 0
    for i, pdf in enumerate(targets, 1):
        try:
            summary = process_file(pdf, output_dir, args.dpi, args.verbose, args.dry_run)
            if not args.dry_run:
                append_log(log_path, summary)
            if summary['fields_detected'] == 0:
                empty += 1
            elif summary['avg_confidence'] >= CONFIDENCE_THRESHOLD:
                processed += 1
            else:
                review += 1
            print(f'[{i}/{len(targets)}] {pdf.name}: '
                  f'{summary["fields_detected"]} fields, '
                  f'avg conf {summary["avg_confidence"]:.2f}, '
                  f'{summary["elapsed_seconds"]:.1f}s')
        except Exception as exc:
            failed += 1
            print(f'[{i}/{len(targets)}] FAIL {pdf.name}: {exc}', file=sys.stderr)
            if args.verbose:
                import traceback
                traceback.print_exc()

    print()
    print(f'Done: {processed} processed, {review} needs-review, '
          f'{empty} no-fields, {failed} failed')
    print(f'Log: {log_path}')
    return 0 if failed == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
