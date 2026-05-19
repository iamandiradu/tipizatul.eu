#!/usr/bin/env python3
"""Apply chat-produced shape labels to a PDF.

The chat workflow:
  1. Run `dump_struct.py <pdf>` (or `--batch`) to write `<stem>.struct.json`
     and an empty `<stem>.labels.json` into a work dir.
  2. Open the .struct.json in a chat session with a strong model (Claude
     in chat, ChatGPT, etc.). Ask it to fill in the matching .labels.json
     in the format documented in dump_struct.py.
  3. Run this script. It reads the labels.json, drops them through the
     same hallucination filter + widget positioning as extract_digital.py,
     and writes the fillable AcroForm PDF.

Use this when you don't have an Anthropic API key — the model in the chat
session is the LLM, you're just relaying input and output through files.

Single file:
  python chat_apply.py <input.pdf> <labels.json> <output.pdf>

Batch (matches struct.json + labels.json pairs against source PDFs by stem):
  python chat_apply.py --batch <work-dir> --pdf-dir <source-pdfs-dir> --out <output-dir>

labels.json shape (no wrapping needed):
  {
    "fields": [
      {"shape_id": 0, "type": "text", "label": "Tel.", "confidence": 0.97},
      ...
    ]
  }

Any shape not present in labels.json is still emitted as an unlabelled
blank with low confidence (`shape_only` context) — same fallback as
extract_digital.py. So a partially-labelled labels.json gets you partial
labels, not a broken file.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from extract_digital import _verify_label, _widget_rect
from lib.classify import classify
from lib.page_render import extract_text_tokens
from lib.pdf_structure import extract
from lib.shape_prompt import parse_response


SCRIPT_DIR = Path(__file__).resolve().parent
NODE_WRITER = SCRIPT_DIR.parent / 'apply-fields.mjs'
DEFAULT_OUTPUT = SCRIPT_DIR / 'output-chat'


def apply_one(
    in_pdf: Path, labels_json: Path, out_pdf: Path, *, model_name: str,
) -> dict:
    """Returns the summary dict so the batch driver can aggregate."""
    cls = classify(str(in_pdf))
    pages = extract(str(in_pdf))
    page_tokens = extract_text_tokens(str(in_pdf))

    labelled = parse_response(labels_json.read_text(encoding='utf-8'))
    by_id = {l.shape_id: l for l in labelled}

    fields: list[dict] = []
    for page in pages:
        for s in page.shapes:
            lab = by_id.get(s.id)
            field_type = 'checkbox' if s.kind == 'checkbox' else 'text'
            if lab is None:
                label, label_conf, det_conf, combined = '', 0.0, 0.5, 0.35
                context = 'shape_only'
            else:
                label, label_conf = _verify_label(lab.label, page_tokens)
                det_conf = lab.confidence
                combined = 0.7 * det_conf + (0.3 * label_conf if label else 0.0)
                context = 'chat'
            rect = _widget_rect(s, page, field_type)
            fields.append({
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

    avg_conf = sum(f['confidence'] for f in fields) / len(fields) if fields else 0.0
    needs_review = cls.is_scan or not fields or avg_conf < 0.95

    payload = {
        'source': str(in_pdf),
        'avgConfidence': avg_conf,
        'isScan': cls.is_scan,
        'needsReview': needs_review,
        'extractor': 'llm_digital_chat',
        'model': model_name,
        'fields': fields,
    }
    fields_out = out_pdf.with_suffix('.fields.json')
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    fields_out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8',
    )

    if not NODE_WRITER.exists():
        raise FileNotFoundError(f'Node writer not found: {NODE_WRITER}')
    r = subprocess.run(
        ['node', str(NODE_WRITER), str(in_pdf), str(fields_out), str(out_pdf)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        sys.stderr.write(r.stdout); sys.stderr.write(r.stderr)
        raise RuntimeError(f'Node writer failed for {in_pdf}: exit {r.returncode}')

    labelled_count = sum(1 for f in fields if f['context'] == 'chat')
    return {
        'name': in_pdf.name,
        'shapes': len(fields),
        'labelled': labelled_count,
        'avg_conf': avg_conf,
        'needs_review': needs_review,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Apply chat-produced shape labels to a PDF (single or batch).',
    )
    parser.add_argument('input', nargs='?', help='Input PDF (single-file mode)')
    parser.add_argument('labels', nargs='?', help='Labels JSON (single-file mode)')
    parser.add_argument('output', nargs='?', help='Output PDF (single-file mode)')

    parser.add_argument('--batch', help='Work directory with *.struct.json + *.labels.json pairs')
    parser.add_argument('--pdf-dir', help='Source PDFs directory (for --batch mode)')
    parser.add_argument('--out', default=str(DEFAULT_OUTPUT),
                        help='Output directory (--batch mode; default ./output-chat)')
    parser.add_argument('--model', default='chat',
                        help='Model name to record in fields.json (default "chat")')
    args = parser.parse_args()

    if args.batch:
        if not args.pdf_dir:
            parser.error('--batch requires --pdf-dir <source-pdf-dir>')
        work = Path(args.batch).resolve()
        pdf_dir = Path(args.pdf_dir).resolve()
        out_dir = Path(args.out).resolve()
        if not work.is_dir() or not pdf_dir.is_dir():
            print('--batch and --pdf-dir must be existing directories', file=sys.stderr)
            return 1
        # Pair labels.json files with source PDFs by stem.
        labels_files = sorted(work.glob('*.labels.json'))
        if not labels_files:
            print(f'No *.labels.json files found in {work}', file=sys.stderr)
            return 1
        print(f'Found {len(labels_files)} labels.json file(s) in {work}')
        processed = skipped = failed = 0
        for i, lj in enumerate(labels_files, 1):
            stem = lj.name[:-len('.labels.json')]
            pdf = pdf_dir / f'{stem}.pdf'
            if not pdf.is_file():
                print(f'[{i}/{len(labels_files)}] SKIP {stem}: no source PDF at {pdf}',
                      file=sys.stderr)
                skipped += 1
                continue
            out_pdf = out_dir / f'{stem}.pdf'
            try:
                s = apply_one(pdf, lj, out_pdf, model_name=args.model)
                processed += 1
                print(f'[{i}/{len(labels_files)}] {s["name"]}: '
                      f'{s["shapes"]} shapes, {s["labelled"]} labelled, '
                      f'avg conf {s["avg_conf"]:.2f}'
                      f'{"  ⚑ review" if s["needs_review"] else ""}')
            except Exception as exc:
                failed += 1
                print(f'[{i}/{len(labels_files)}] FAIL {stem}: {exc}', file=sys.stderr)
        print()
        print(f'Done: {processed} processed, {skipped} skipped (no source PDF), {failed} failed')
        return 0 if failed == 0 else 2

    # Single-file mode.
    if not (args.input and args.labels and args.output):
        parser.error('Provide <input.pdf> <labels.json> <output.pdf> or use --batch')
    s = apply_one(
        Path(args.input).resolve(),
        Path(args.labels).resolve(),
        Path(args.output).resolve(),
        model_name=args.model,
    )
    print(f'{s["name"]}: {s["shapes"]} shapes, {s["labelled"]} labelled, '
          f'avg conf {s["avg_conf"]:.2f}'
          f'{"  ⚑ review" if s["needs_review"] else ""}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
