"""Vision-LLM prompt + response parser for form-field extraction.

The model returns one JSON object per page with a `fields` array. Each
field has:
  - label:      the human-readable text immediately adjacent to the blank
  - type:       'text' or 'checkbox'
  - bbox_norm:  [x, y, w, h] in 0..1, image coords, top-left origin
  - confidence: model self-rating (0..1)

We post-process to (a) reject malformed entries, (b) cross-check the
proposed label against the page's actual text tokens, and (c) clamp
bboxes to the page rectangle.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass


# Tuned through trial-and-error on Romanian admin forms. Key design notes:
#   - We name the fields we want explicitly. Vision models drift toward
#     "describe the page" without an enumeration of targets.
#   - We forbid prose. The `format=json` Ollama flag enforces JSON syntax,
#     but a stubborn model will still wrap it in ```json fences without
#     a strong instruction. Saying "no markdown, no commentary" is cheap.
#   - We give a worked example. Few-shot is the single biggest accuracy
#     lever for layout tasks with small models.
PROMPT = """You are analysing a single page from a Romanian government form (cerere, declarație, formular).

Find every blank space where a citizen would write or tick to fill in the form. There are two kinds:

  - "text"     : a horizontal blank line, dot-leader (...........), underscore run (_______), or empty box where the user writes text/numbers. Examples: name, address, CNP, date, phone, IBAN, signature placeholder.
  - "checkbox" : a small square (typically 6–14 pt) that the user ticks to indicate a choice.

DO NOT include:
  - Headings, body paragraphs, instructions, page numbers.
  - Pre-filled values or sample text.
  - Decorative dotted lines under headings (only count the line if it's a fill-in blank).
  - Logos, stamps, watermarks.

For each field, return:
  - label       : the closest readable Romanian text that identifies the field (e.g. "Numele și prenumele", "CNP", "Data nașterii"). If the field has no clear label, use "".
  - type        : "text" or "checkbox".
  - bbox_norm   : [x, y, w, h] as fractions of the image dimensions, top-left origin. x=left edge, y=top edge.
  - confidence  : your own confidence this is a real fillable field, 0..1.

Return ONLY a single JSON object of the form:

{
  "fields": [
    {"label": "Numele și prenumele", "type": "text", "bbox_norm": [0.12, 0.18, 0.55, 0.02], "confidence": 0.94},
    {"label": "Sunt de acord", "type": "checkbox", "bbox_norm": [0.08, 0.62, 0.012, 0.012], "confidence": 0.88}
  ]
}

No markdown fences, no commentary, no trailing text. If the page contains no fillable fields, return {"fields": []}."""


@dataclass
class ParsedField:
    label: str
    type: str
    x_norm: float
    y_norm: float
    w_norm: float
    h_norm: float
    confidence: float


def parse_response(text: str) -> list[ParsedField]:
    """Lift `fields` array out of the model output and validate each entry.

    Tolerant of (a) leading/trailing whitespace, (b) accidental markdown
    fences ```json ... ```, (c) trailing commentary after the JSON.
    """
    obj = _coerce_json(text)
    if not isinstance(obj, dict):
        return []
    raw_fields = obj.get('fields')
    if not isinstance(raw_fields, list):
        return []

    out: list[ParsedField] = []
    for f in raw_fields:
        parsed = _parse_one(f)
        if parsed is not None:
            out.append(parsed)
    return out


def _parse_one(f) -> ParsedField | None:
    if not isinstance(f, dict):
        return None

    bbox = f.get('bbox_norm') or f.get('bbox')
    if not isinstance(bbox, list) or len(bbox) != 4:
        return None
    try:
        x, y, w, h = (float(v) for v in bbox)
    except (TypeError, ValueError):
        return None

    # Reject degenerate or off-page bboxes outright; clamp soft cases.
    if w <= 0 or h <= 0 or w > 1 or h > 1:
        return None
    x = _clamp01(x)
    y = _clamp01(y)
    if x + w > 1: w = 1 - x
    if y + h > 1: h = 1 - y
    if w <= 0 or h <= 0:
        return None

    kind = str(f.get('type', '')).strip().lower()
    if kind not in ('text', 'checkbox'):
        # Be lenient on common drift: "input" / "field" → text.
        kind = 'checkbox' if 'check' in kind or 'tick' in kind else 'text'

    try:
        confidence = float(f.get('confidence', 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = _clamp01(confidence)

    label = f.get('label')
    label = label.strip() if isinstance(label, str) else ''

    return ParsedField(
        label=label,
        type=kind,
        x_norm=x, y_norm=y, w_norm=w, h_norm=h,
        confidence=confidence,
    )


def _clamp01(v: float) -> float:
    if v < 0: return 0.0
    if v > 1: return 1.0
    return v


_FENCE_RE = re.compile(r'^\s*```(?:json)?\s*|\s*```\s*$', re.IGNORECASE)


def _coerce_json(text: str):
    """Best-effort JSON parse. Strips markdown fences and trims any
    leading/trailing prose that drifted in despite the JSON-mode flag."""
    stripped = _FENCE_RE.sub('', text.strip())
    # Fast path: it's already valid.
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    # Heuristic: pull the largest {...} block.
    first = stripped.find('{')
    last = stripped.rfind('}')
    if first == -1 or last == -1 or last <= first:
        return None
    candidate = stripped[first:last + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None
