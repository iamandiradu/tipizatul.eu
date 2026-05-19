"""Prompt + parser for the born-digital path.

Sends a structured representation of the page (words + candidate shapes
already detected via PyMuPDF) to a text-only LLM and asks it to pick
which shapes are fillable fields, label them, and rate confidence.

The model is *not* asked to invent new fields — only to filter and label
the shapes the vector extractor already found. This keeps the prompt
compact and grounds output in the page's actual geometry.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass


SYSTEM = """You label form fields on a single page of a Romanian government form (cerere, declarație, formular).

INPUT (provided below):
  - WORDS: every word on the page with its bounding box in PDF points (top-left origin).
  - SHAPES: candidate form fields already detected from the PDF's vector geometry. Each shape has an integer id, a `kind` (`underline`, `checkbox`, or `cell`), and a bounding box. ASSUME every shape is a fillable field unless you have a strong reason to reject it.

OUTPUT: for EVERY shape, return one entry in the `fields` array — including a label, a type, and a confidence.

Field types (forced by shape kind, do not override):
  - "text"     : EVERY `underline` and `cell` shape.
  - "checkbox" : EVERY `checkbox` shape.

How to choose the label:
  1. Look for the readable Romanian words immediately to the LEFT of the shape on the same line (same y, smaller x). Combine consecutive words that belong together (e.g. "Numele și prenumele", "Seria și numărul cărții de identitate", "Cod poștal").
  2. If nothing is to the left, look at the words directly ABOVE (same x range, smaller y).
  3. Single-letter abbreviations are real labels — keep them: "Nr.", "Bl.", "Sc.", "Ap.", "Et.", "Jud.".
  4. Strip trailing colons, dots, semicolons.
  5. If nothing fits, set `label` to "" (empty string).

Confidence (0..1):
  - 0.95+  : strong label clearly identifies the field.
  - 0.80–0.94 : label is plausible but partial/ambiguous.
  - < 0.80 : no clean label, or the shape looks decorative.

Return ONLY one JSON object — no markdown fences, no commentary. Example shape (replace ids with the real ones from the input):

{
  "fields": [
    {"shape_id": 0, "type": "text", "label": "Numele și prenumele", "confidence": 0.96},
    {"shape_id": 1, "type": "text", "label": "Bl.", "confidence": 0.9},
    {"shape_id": 2, "type": "checkbox", "label": "Sunt de acord", "confidence": 0.92}
  ]
}

Include one entry PER SHAPE. Only use shape_id values that appear in the input."""


def build_prompt(page_dict: dict) -> str:
    """page_dict comes from pdf_structure.page_to_prompt_dict(page)."""
    return (
        SYSTEM
        + '\n\nPAGE DATA:\n'
        + json.dumps(page_dict, ensure_ascii=False, separators=(',', ':'))
    )


@dataclass
class LabelledShape:
    shape_id: int
    type: str
    label: str
    confidence: float


def parse_response(text: str) -> list[LabelledShape]:
    obj = _coerce_json(text)
    if not isinstance(obj, dict):
        return []
    raw = obj.get('fields')
    if not isinstance(raw, list):
        return []
    out: list[LabelledShape] = []
    for f in raw:
        parsed = _parse_one(f)
        if parsed is not None:
            out.append(parsed)
    return out


def _parse_one(f) -> LabelledShape | None:
    if not isinstance(f, dict):
        return None
    sid = f.get('shape_id')
    if not isinstance(sid, int):
        try:
            sid = int(sid)
        except (TypeError, ValueError):
            return None
    kind = str(f.get('type', '')).strip().lower()
    if kind not in ('text', 'checkbox'):
        kind = 'checkbox' if 'check' in kind or 'tick' in kind else 'text'
    label = f.get('label')
    label = label.strip() if isinstance(label, str) else ''
    try:
        confidence = float(f.get('confidence', 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    if confidence < 0: confidence = 0.0
    if confidence > 1: confidence = 1.0
    return LabelledShape(shape_id=sid, type=kind, label=label, confidence=confidence)


_FENCE_RE = re.compile(r'^\s*```(?:json)?\s*|\s*```\s*$', re.IGNORECASE)


def _coerce_json(text: str):
    stripped = _FENCE_RE.sub('', text.strip())
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass
    first = stripped.find('{')
    last = stripped.rfind('}')
    if first == -1 or last == -1 or last <= first:
        return None
    try:
        return json.loads(stripped[first:last + 1])
    except json.JSONDecodeError:
        return None
