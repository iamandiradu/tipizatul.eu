#!/usr/bin/env python3
"""Detect form fields in PDFs using a local vision LLM (Ollama), then
write fillable AcroForm PDFs via the existing Node writer.

Outputs are schema-compatible with paddle/detect_fields.py so the admin
upload page accepts either pipeline's results interchangeably. Two extra
flags surface on the output JSON: `isScan` and `needsReview`.

Usage:
  python scan_pdf.py <input.pdf>
  python scan_pdf.py --batch <dir>
  python scan_pdf.py file.pdf --model qwen2.5vl:7b --dpi 200 --verbose
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from lib.classify import PdfClassification, classify
from lib.field_prompt import PROMPT, ParsedField, parse_response
from lib.ollama_client import (
    OllamaError,
    ensure_model_available,
    generate_json,
    png_to_b64,
)
from lib.page_render import RenderedPage, extract_text_tokens, render_pages


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPT_DIR / 'output'
DEFAULT_LOG = SCRIPT_DIR / 'detections.log'
NODE_WRITER = SCRIPT_DIR.parent / 'apply-fields.mjs'

DEFAULT_MODEL = 'qwen2.5vl:3b'
DEFAULT_HOST = 'http://localhost:11434'
DEFAULT_DPI = 150

# Per the task spec: anything under 0.95 average confidence (or any scan)
# is flagged for human review. High by design — LLM outputs need a
# closer look than the heuristic pipeline.
REVIEW_CONFIDENCE_THRESHOLD = 0.95


def process_file(
    pdf_path: Path,
    output_dir: Path,
    *,
    model: str,
    host: str,
    dpi: int,
    timeout: float,
    verbose: bool,
    dry_run: bool,
) -> dict:
    t0 = time.monotonic()
    cls = classify(str(pdf_path))
    pages = render_pages(str(pdf_path), dpi=dpi)
    page_tokens = extract_text_tokens(str(pdf_path))

    all_fields_json: list[dict] = []
    page_errors: list[str] = []

    for page in pages:
        try:
            parsed = _infer_page(page, model=model, host=host, timeout=timeout)
        except OllamaError as exc:
            page_errors.append(f'page {page.page_index}: {exc}')
            continue

        for f in parsed:
            field_json = _to_field_json(f, page, page_tokens)
            all_fields_json.append(field_json)

    avg_conf = (
        sum(f['confidence'] for f in all_fields_json) / len(all_fields_json)
        if all_fields_json else 0.0
    )
    elapsed = time.monotonic() - t0

    needs_review = (
        cls.is_scan
        or not all_fields_json
        or avg_conf < REVIEW_CONFIDENCE_THRESHOLD
    )

    summary = {
        'source': str(pdf_path),
        'pages': len(pages),
        'fields_detected': len(all_fields_json),
        'avg_confidence': round(avg_conf, 3),
        'elapsed_seconds': round(elapsed, 2),
        'output_pdf': None,
        'fields': all_fields_json,
        'is_scan': cls.is_scan,
        'category': cls.category,
        'needs_review': needs_review,
        'model': model,
        'page_errors': page_errors,
    }

    if verbose:
        _print_verbose(pdf_path, summary)

    if dry_run or not all_fields_json:
        return summary

    output_dir.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem
    json_path = output_dir / f'{stem}.fields.json'
    out_pdf = output_dir / f'{stem}.pdf'

    json_path.write_text(json.dumps({
        'source': str(pdf_path),
        'avgConfidence': avg_conf,
        'isScan': cls.is_scan,
        'needsReview': needs_review,
        'model': model,
        'fields': all_fields_json,
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    _invoke_node_writer(pdf_path, json_path, out_pdf)
    summary['output_pdf'] = str(out_pdf)
    return summary


# ── Per-page inference ──────────────────────────────────────────────────────

def _infer_page(page: RenderedPage, *, model: str, host: str, timeout: float) -> list[ParsedField]:
    image_b64 = png_to_b64(page.png_bytes)
    resp = generate_json(PROMPT, image_b64, model=model, host=host, timeout=timeout)
    return parse_response(resp.text)


def _to_field_json(f: ParsedField, page: RenderedPage, page_tokens: set[str]) -> dict:
    # Normalised image coords → PDF points (bottom-left origin).
    x_pt = f.x_norm * page.width_pt
    w_pt = f.w_norm * page.width_pt
    h_pt = f.h_norm * page.height_pt
    y_top_pt = f.y_norm * page.height_pt
    y_pt = page.height_pt - y_top_pt - h_pt

    label_conf = _label_credibility(f.label, page_tokens) if f.label else 0.0
    detection_conf = f.confidence
    label_present = bool(f.label)

    # Combined confidence:
    #   - model self-rating × geometric-mean-style penalty for unbacked labels
    #   - bbox sanity is already enforced by the parser (off-page rejected)
    if label_present:
        combined = (detection_conf * 0.7) + (label_conf * 0.3)
    else:
        combined = detection_conf * 0.7   # 30% penalty for missing label

    return {
        'type': f.type,
        'page': page.page_index,
        'x': round(x_pt, 2),
        'y': round(y_pt, 2),
        'width': round(w_pt, 2),
        'height': round(h_pt, 2),
        'label': f.label or None,
        'confidence': round(combined, 3),
        'context': 'llm_vision',
        'detectionConfidence': round(detection_conf, 3),
        'labelConfidence': round(label_conf, 3),
    }


def _label_credibility(label: str, page_tokens: set[str]) -> float:
    """Fraction of label tokens that appear in the PDF's extractable text.

    Returns 1.0 when every token is found, 0.0 when none are. Pure scans
    have an empty token set; in that case we can't verify, so we return
    a neutral 0.5 to avoid double-penalising scans."""
    if not page_tokens:
        return 0.5
    label_tokens = [
        ''.join(c for c in t if c.isalnum()).lower()
        for t in label.split()
    ]
    label_tokens = [t for t in label_tokens if len(t) >= 2]
    if not label_tokens:
        return 0.0
    hits = sum(1 for t in label_tokens if t in page_tokens)
    return hits / len(label_tokens)


# ── Node writer hand-off ────────────────────────────────────────────────────

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


# ── Reporting ───────────────────────────────────────────────────────────────

def _print_verbose(pdf_path: Path, summary: dict) -> None:
    print(f'  File: {pdf_path}')
    print(f'  Pages: {summary["pages"]}, fields: {summary["fields_detected"]}, '
          f'avg conf: {summary["avg_confidence"]:.2f}, '
          f'elapsed: {summary["elapsed_seconds"]:.1f}s, '
          f'category: {summary["category"]}, '
          f'needs_review: {summary["needs_review"]}')
    for f in summary['fields']:
        label = f['label'] or '(no label)'
        print(f'    [{f["context"]:11}] {f["type"]:8} "{label[:60]}" '
              f'page {f["page"]} ({f["x"]:.0f},{f["y"]:.0f}) '
              f'{f["width"]:.0f}x{f["height"]:.0f} '
              f'conf={f["confidence"]:.2f}')
    for err in summary['page_errors']:
        print(f'    ERROR: {err}')


def append_log(log_path: Path, summary: dict) -> None:
    """Append-only run log. Same structure as paddle/detections.log so
    a single tail covers either pipeline."""
    lines: list[str] = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    if summary['is_scan']:
        status = 'SCAN_NEEDS_REVIEW'
    elif summary['fields_detected'] == 0:
        status = 'NO_FIELDS'
    elif summary['avg_confidence'] < REVIEW_CONFIDENCE_THRESHOLD:
        status = 'LOW_CONFIDENCE_REVIEW'
    else:
        status = 'PROCESSED'

    lines.append('=' * 80)
    lines.append(f'[{ts}] {summary["source"]}')
    lines.append(
        f'  Pages: {summary["pages"]} | Fields: {summary["fields_detected"]} | '
        f'Extractor: llm ({summary["model"]}) | '
        f'Avg confidence: {summary["avg_confidence"]:.3f} | '
        f'Category: {summary["category"]} | '
        f'Status: {status} | Elapsed: {summary["elapsed_seconds"]:.1f}s'
    )
    if summary.get('output_pdf'):
        lines.append(f'  Output: {summary["output_pdf"]}')
    for err in summary.get('page_errors', []):
        lines.append(f'  Page error: {err}')

    for i, f in enumerate(summary['fields'], 1):
        label = f['label'] or '(no label)'
        lines.append(
            f'  [{i:03d}] {f["type"]:8} | conf={f["confidence"]:.2f} | '
            f'src={f["context"]:11} | page={f["page"]} | '
            f'rect=({f["x"]:.0f},{f["y"]:.0f},{f["width"]:.0f}x{f["height"]:.0f}) | '
            f'label="{label[:80]}"'
        )
    lines.append('')

    with log_path.open('a', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')


# ── CLI ─────────────────────────────────────────────────────────────────────

def find_pdfs(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob('*.pdf') if p.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description='Detect form fields in PDFs via a local vision LLM.')
    parser.add_argument('input', nargs='?', help='Input PDF file')
    parser.add_argument('--batch', help='Process every PDF under this directory (recursive)')
    parser.add_argument('--out', default=str(DEFAULT_OUTPUT), help='Output directory')
    parser.add_argument('--log', default=str(DEFAULT_LOG), help='Append-only log path')
    parser.add_argument('--model', default=DEFAULT_MODEL, help=f'Ollama model tag (default {DEFAULT_MODEL})')
    parser.add_argument('--ollama-host', default=DEFAULT_HOST, help='Ollama HTTP endpoint')
    parser.add_argument('--dpi', type=int, default=DEFAULT_DPI, help=f'Render DPI (default {DEFAULT_DPI})')
    parser.add_argument('--timeout', type=float, default=600,
                        help='Per-page HTTP timeout in seconds (default 600). '
                             'Bump if you are on CPU-only Ollama and seeing TimeoutError.')
    parser.add_argument('--dry-run', action='store_true', help="Detect but don't write the AcroForm PDF")
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    if not args.input and not args.batch:
        parser.error('Provide an input PDF or --batch <dir>')

    output_dir = Path(args.out).resolve()
    log_path = Path(args.log).resolve()

    try:
        ensure_model_available(args.model, host=args.ollama_host)
    except OllamaError as exc:
        print(str(exc), file=sys.stderr)
        return 1

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

    processed = review = empty = scans = failed = 0
    for i, pdf in enumerate(targets, 1):
        try:
            summary = process_file(
                pdf, output_dir,
                model=args.model,
                host=args.ollama_host,
                dpi=args.dpi,
                timeout=args.timeout,
                verbose=args.verbose,
                dry_run=args.dry_run,
            )
            if not args.dry_run:
                append_log(log_path, summary)
            if summary['is_scan']:
                scans += 1
            if summary['fields_detected'] == 0:
                empty += 1
            elif summary['needs_review']:
                review += 1
            else:
                processed += 1
            print(
                f'[{i}/{len(targets)}] {pdf.name}: '
                f'{summary["fields_detected"]} fields, '
                f'avg conf {summary["avg_confidence"]:.2f}, '
                f'category {summary["category"]}, '
                f'{summary["elapsed_seconds"]:.1f}s'
                + ('  ⚑ review' if summary['needs_review'] else '')
            )
        except Exception as exc:
            failed += 1
            print(f'[{i}/{len(targets)}] FAIL {pdf.name}: {exc}', file=sys.stderr)
            if args.verbose:
                import traceback
                traceback.print_exc()

    print()
    print(
        f'Done: {processed} processed, {review} needs-review, '
        f'{empty} no-fields, {scans} scans, {failed} failed'
    )
    print(f'Log: {log_path}')
    return 0 if failed == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
