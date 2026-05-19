#!/usr/bin/env python3
"""Apply Opus-produced shape labels to a PDF.

The Opus path uses the same architecture as extract_digital.py: shapes
are extracted from the PDF by pdf_structure.extract(), labelled by a
model (here: Opus rather than a local LLM), then written as AcroForm
fields with the same widget-positioning logic.

Usage:
  python opus_apply.py <input.pdf> <labels.json> <output.pdf>

labels.json format (no top-level wrapping needed):
  {
    "fields": [
      {"shape_id": 0, "type": "text", "label": "Tel.", "confidence": 0.97},
      ...
    ]
  }

Any shape not present in labels.json is still emitted as an unlabelled
blank with low confidence (same fallback as extract_digital.py).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from extract_digital import _verify_label, _widget_rect
from lib.classify import classify
from lib.page_render import extract_text_tokens
from lib.pdf_structure import extract
from lib.shape_prompt import LabelledShape, parse_response


SCRIPT_DIR = Path(__file__).resolve().parent
NODE_WRITER = SCRIPT_DIR.parent / 'apply-fields.mjs'


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print('Usage: opus_apply.py <input.pdf> <labels.json> <output.pdf>',
              file=sys.stderr)
        return 1
    in_pdf = Path(argv[1]).resolve()
    labels_json = Path(argv[2]).resolve()
    out_pdf = Path(argv[3]).resolve()

    cls = classify(str(in_pdf))
    pages = extract(str(in_pdf))
    page_tokens = extract_text_tokens(str(in_pdf))

    labels_raw = labels_json.read_text(encoding='utf-8')
    labelled = parse_response(labels_raw)
    # Index by shape_id so we can attach per-page.
    by_id = {l.shape_id: l for l in labelled}

    fields: list[dict] = []
    for page in pages:
        for s in page.shapes:
            lab = by_id.get(s.id)
            field_type = 'checkbox' if s.kind == 'checkbox' else 'text'
            if lab is None:
                label, label_conf = '', 0.0
                det_conf = 0.5
                combined = 0.35
                context = 'shape_only'
            else:
                label, label_conf = _verify_label(lab.label, page_tokens)
                det_conf = lab.confidence
                combined = 0.7 * det_conf + (0.3 * label_conf if label else 0.0)
                context = 'opus_digital'
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

    json_payload = {
        'source': str(in_pdf),
        'avgConfidence': avg_conf,
        'isScan': cls.is_scan,
        'needsReview': needs_review,
        'extractor': 'opus_digital',
        'model': 'claude-opus-4-7',
        'fields': fields,
    }
    fields_out = out_pdf.with_suffix('.fields.json')
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    fields_out.write_text(
        json.dumps(json_payload, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )

    # Hand off to the Node writer.
    if not NODE_WRITER.exists():
        print(f'Node writer not found: {NODE_WRITER}', file=sys.stderr)
        return 2
    result = subprocess.run(
        ['node', str(NODE_WRITER), str(in_pdf), str(fields_out), str(out_pdf)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stdout); sys.stderr.write(result.stderr)
        return result.returncode

    labelled_count = sum(1 for f in fields if f['context'] == 'opus_digital')
    print(f'{in_pdf.name}: {len(fields)} shapes, {labelled_count} labelled, '
          f'avg conf {avg_conf:.2f}{"  ⚑ review" if needs_review else ""}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
