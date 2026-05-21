#!/usr/bin/env python3
"""Dump a PDF's page structure (words + candidate shapes) to JSON for a
chat-driven labelling workflow.

Use this when you don't have an Anthropic API key and want a strong
LLM (Claude in a chat window, ChatGPT, etc.) to label shapes by reading
the JSON and producing a matching labels.json. The output schema
matches what `chat_apply.py` expects.

Usage:
  python dump_struct.py <input.pdf> [--out <dir>]
  python dump_struct.py --batch <dir> [--out <dir>]

Per PDF the script writes two files into `<out>/`:
  - <stem>.struct.json  : page words + shapes, the input you give the LLM
  - <stem>.labels.json  : empty template (`{"fields": []}`); the LLM
                          fills it in. Already on disk so you can pipe
                          chat output directly to it.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.classify import classify
from lib.pdf_structure import extract, page_to_prompt_dict


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUT = SCRIPT_DIR / 'chat-work'


def dump_one(pdf: Path, out_dir: Path) -> tuple[int, int]:
    """Returns (page_count, total_shape_count)."""
    cls = classify(str(pdf))
    pages = extract(str(pdf))
    payload = {
        'source': str(pdf),
        'is_scan': cls.is_scan,
        'category': cls.category,
        'page_count': len(pages),
        'pages': [page_to_prompt_dict(p) for p in pages],
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    struct_path = out_dir / f'{pdf.stem}.struct.json'
    labels_path = out_dir / f'{pdf.stem}.labels.json'
    struct_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8',
    )
    # Don't overwrite an existing labels.json — that would clobber
    # whatever the chat session has already produced.
    if not labels_path.exists():
        labels_path.write_text(
            json.dumps({'fields': []}, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )
    total_shapes = sum(len(p.shapes) for p in pages)
    return len(pages), total_shapes


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Dump PDF page structure for chat-driven labelling.',
    )
    parser.add_argument('input', nargs='?', help='Input PDF file')
    parser.add_argument('--batch', help='Process every PDF under this directory')
    parser.add_argument('--out', default=str(DEFAULT_OUT),
                        help='Output directory for struct.json + labels.json '
                             f'pairs (default {DEFAULT_OUT})')
    args = parser.parse_args()

    if not args.input and not args.batch:
        parser.error('Provide an input PDF or --batch <dir>')

    out_dir = Path(args.out).resolve()

    if args.batch:
        root = Path(args.batch).resolve()
        if not root.is_dir():
            print(f'Directory not found: {root}', file=sys.stderr)
            return 1
        pdfs = sorted(p for p in root.rglob('*.pdf') if p.is_file())
    else:
        single = Path(args.input).resolve()
        if not single.is_file():
            print(f'File not found: {single}', file=sys.stderr)
            return 1
        pdfs = [single]

    print(f'Dumping {len(pdfs)} PDF(s) → {out_dir}')
    for i, pdf in enumerate(pdfs, 1):
        n_pages, n_shapes = dump_one(pdf, out_dir)
        print(f'[{i}/{len(pdfs)}] {pdf.name}: {n_pages}p / {n_shapes} shapes '
              f'→ {pdf.stem}.struct.json + {pdf.stem}.labels.json')
    print()
    print('Next: open each .struct.json in your chat session, ask the model')
    print('to fill in the matching .labels.json, then run:')
    print(f'  python chat_apply.py --batch {out_dir} --pdf-dir <path-to-source-pdfs>')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
