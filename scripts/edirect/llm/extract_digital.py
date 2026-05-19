#!/usr/bin/env python3
"""Born-digital path: extract words + candidate shapes from a PDF, ask a
local text-only LLM which shapes are fillable fields, write the AcroForm.

Far faster than the vision path (~2–4 s/page on M1 with qwen2.5:3b) and
much more accurate on born-digital PDFs because it grounds the model in
the page's actual geometry instead of asking it to read pixels.

Output schema is identical to scan_pdf.py / paddle's detect_fields.py.

Usage:
  python extract_digital.py <input.pdf>
  python extract_digital.py --batch <dir>
  python extract_digital.py file.pdf --model qwen2.5:7b --verbose
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from lib.classify import classify
from lib.ollama_client import OllamaError, ensure_model_available, generate_json
from lib.page_render import extract_text_tokens
from lib.pdf_structure import PageStructure, Shape, extract, page_to_prompt_dict
from lib.shape_prompt import LabelledShape, build_prompt, parse_response


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPT_DIR / 'output'
DEFAULT_LOG = SCRIPT_DIR / 'detections.log'
NODE_WRITER = SCRIPT_DIR.parent / 'apply-fields.mjs'

DEFAULT_MODEL = 'qwen2.5:7b'
DEFAULT_HOST = 'http://localhost:11434'

REVIEW_CONFIDENCE_THRESHOLD = 0.95


def process_file(
    pdf_path: Path,
    output_dir: Path,
    *,
    model: str,
    host: str,
    timeout: float,
    verbose: bool,
    dry_run: bool,
) -> dict:
    t0 = time.monotonic()
    cls = classify(str(pdf_path))
    pages = extract(str(pdf_path))
    page_tokens = extract_text_tokens(str(pdf_path))

    all_fields_json: list[dict] = []
    page_errors: list[str] = []

    for page in pages:
        if not page.shapes:
            # No vector shapes → nothing to label. Skip silently; the
            # scan path would handle pages like this.
            continue
        try:
            labelled = _infer_page(page, model=model, host=host, timeout=timeout)
        except (OllamaError, Exception) as exc:
            page_errors.append(f'page {page.page_index}: {exc}')
            labelled = []   # fall through and emit unlabelled shapes
        for f in _zip_to_fields(labelled, page, page_tokens):
            all_fields_json.append(f)

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
        'extractor': 'llm_digital',
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
        'extractor': 'llm_digital',
        'model': model,
        'fields': all_fields_json,
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    _invoke_node_writer(pdf_path, json_path, out_pdf)
    summary['output_pdf'] = str(out_pdf)
    return summary


# ── Per-page inference ──────────────────────────────────────────────────────

def _infer_page(
    page: PageStructure, *, model: str, host: str, timeout: float,
) -> list[LabelledShape]:
    prompt = build_prompt(page_to_prompt_dict(page))
    resp = generate_json(prompt, model=model, host=host, timeout=timeout)
    return parse_response(resp.text)


def _zip_to_fields(
    labelled: list[LabelledShape],
    page: PageStructure,
    page_tokens: set[str],
) -> list[dict]:
    """Build a field entry for EVERY shape on the page.

    The LLM labels what it can; any shape it skipped or hallucinated is
    still written as an unlabelled blank with low confidence. The
    rationale: the shape detector is rule-based and reliable, so the
    user shouldn't lose a real field just because the model got lazy or
    confused. Missing labels surface via the needsReview flag.
    """
    by_id = {s.id: s for s in page.shapes}
    by_lab: dict[int, LabelledShape] = {}
    for lab in labelled:
        if lab.shape_id in by_id and lab.shape_id not in by_lab:
            by_lab[lab.shape_id] = lab

    out: list[dict] = []
    for s in page.shapes:
        field_type = 'checkbox' if s.kind == 'checkbox' else 'text'
        lab = by_lab.get(s.id)

        if lab is None:
            # LLM didn't address this shape — write it as an unlabelled
            # blank with low confidence so the review queue catches it.
            label, label_conf = '', 0.0
            det_conf = 0.5
            combined = 0.35   # 0.7 * 0.5
            context = 'shape_only'
        else:
            label, label_conf = _verify_label(lab.label, page_tokens)
            det_conf = lab.confidence
            combined = 0.7 * det_conf + (0.3 * label_conf if label else 0.0)
            context = 'llm_digital'

        rect = _widget_rect(s, page, field_type)
        out.append({
            'type': field_type,
            'page': page.page_index,
            'x': round(rect[0], 2),
            'y': round(rect[1], 2),
            'width': round(rect[2], 2),
            'height': round(rect[3], 2),
            'label': label or None,
            'confidence': round(combined, 3),
            'context': context,
            'detectionConfidence': round(det_conf, 3),
            'labelConfidence': round(label_conf, 3),
        })
    return out


# Default input height for a text widget sitting above an underline.
# 10 pt matches the typical 10 pt body font on Romanian admin forms, so
# the typed answer visually lines up with the rest of the page.
_TEXT_INPUT_HEIGHT_PT = 10.0
_INPUT_MIN_HEIGHT_PT = 5.0
# How far above the underline to look for a previous text line. Romanian
# forms are typically single-spaced at 12–18 pt; anything further than
# 25 pt isn't really "the line above".
_ABOVE_SEARCH_PT = 25.0
# Horizontal gap allowed when deciding whether a word "overlaps" the
# shape vertically. A few pt of slop covers letter ascenders.
_OVERLAP_SLOP_PT = 4.0


def _widget_rect(s: Shape, page: PageStructure, field_type: str) -> tuple[float, float, float, float]:
    """Map a shape into the AcroForm widget rect in PDF points (bottom-left).

    - underline shape  → input box sits ABOVE the underline so the line
                         stays visible as a fill hint. Height capped by
                         the distance to the nearest text line above so
                         the widget doesn't cover labels.
    - cell shape       → widget fills the cell (rect unchanged).
    - checkbox         → widget = checkbox rect (unchanged).
    """
    if s.kind == 'underline':
        height = _safe_input_height_for(s, page)
        # Bottom edge of widget = top edge of underline (in pdf coords).
        y_pdf = page.height_pt - s.y
        return (s.x, y_pdf, s.w, height)
    # Cell / checkbox: keep the shape rect as-is, flip y to bottom-left.
    y_pdf = page.height_pt - s.y - s.h
    return (s.x, y_pdf, s.w, s.h)


def _safe_input_height_for(s: Shape, page: PageStructure) -> float:
    """Distance from the top of the underline up to the nearest text
    line above, minus 1 pt of breathing room. Falls back to the default
    when no text line is found above within the search window."""
    above_bottom: float | None = None    # top-left-y of bottom edge of nearest above-word
    for w in page.words:
        # Word must end above the shape (smaller y2 than shape top).
        w_bottom = w.y + w.h
        if w_bottom >= s.y - 0.5:
            continue
        if (s.y - w_bottom) > _ABOVE_SEARCH_PT:
            continue
        # Horizontal overlap with slop.
        if (w.x + w.w) < (s.x - _OVERLAP_SLOP_PT):
            continue
        if w.x > (s.x + s.w + _OVERLAP_SLOP_PT):
            continue
        # Track the lowest (= largest top-left-y) overlapping word above.
        if above_bottom is None or w_bottom > above_bottom:
            above_bottom = w_bottom

    if above_bottom is None:
        return _TEXT_INPUT_HEIGHT_PT
    gap = s.y - above_bottom - 1.0
    if gap <= _INPUT_MIN_HEIGHT_PT:
        return _INPUT_MIN_HEIGHT_PT
    return min(_TEXT_INPUT_HEIGHT_PT, gap)


def _verify_label(label: str, page_tokens: set[str]) -> tuple[str, float]:
    """Reject labels that look hallucinated.

    Returns (kept_label, credibility). If fewer than half the label
    tokens appear in the page text, drop the label and credit it 0.
    Otherwise credit it by hit-rate. Pure-scan pages have an empty
    token set; in that case we can't verify, so return 0.5 to avoid
    double-penalising the LLM path (the classifier should have routed
    us to the scan path anyway).
    """
    if not label:
        return '', 0.0
    if not page_tokens:
        return label, 0.5
    label_tokens = [
        ''.join(c for c in t if c.isalnum()).lower()
        for t in label.split()
    ]
    label_tokens = [t for t in label_tokens if len(t) >= 2]
    if not label_tokens:
        return '', 0.0
    hits = sum(1 for t in label_tokens if t in page_tokens)
    rate = hits / len(label_tokens)
    if rate < 0.5:
        return '', 0.0   # hallucinated — drop
    return label, rate


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
    lines: list[str] = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    if summary['is_scan']:
        status = 'SCAN_WRONG_PATH'  # ran digital extractor on a scan; results suspect
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
        f'Extractor: {summary["extractor"]} ({summary["model"]}) | '
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
    parser = argparse.ArgumentParser(
        description='Detect form fields in born-digital PDFs via a local text-only LLM.'
    )
    parser.add_argument('input', nargs='?', help='Input PDF file')
    parser.add_argument('--batch', help='Process every PDF under this directory (recursive)')
    parser.add_argument('--out', default=str(DEFAULT_OUTPUT), help='Output directory')
    parser.add_argument('--log', default=str(DEFAULT_LOG), help='Append-only log path')
    parser.add_argument('--model', default=DEFAULT_MODEL,
                        help=f'Ollama text model (default {DEFAULT_MODEL})')
    parser.add_argument('--ollama-host', default=DEFAULT_HOST, help='Ollama HTTP endpoint')
    parser.add_argument('--timeout', type=float, default=300,
                        help='Per-page HTTP timeout in seconds (default 300; '
                             'lower with the 3B model, raise on multi-page docs)')
    parser.add_argument('--dry-run', action='store_true')
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
