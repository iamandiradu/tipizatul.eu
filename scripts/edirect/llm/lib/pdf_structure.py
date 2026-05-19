"""Pull words + candidate form-shapes out of a born-digital PDF in PDF-point
coordinates (top-left origin).

Wraps PyMuPDF directly so this module is self-contained — we don't import
the paddle/lib version (which exposes the same data in pixel coords scaled
for the OCR pipeline). For the text-LLM path we want raw PDF points so the
final JSON needs no coordinate conversion.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict

import fitz


# Thresholds in PDF points (1 pt = 1/72 inch).
_HORIZONTAL_TOL_PT = 1.0
_MIN_LINE_LEN_PT = 50.0

_CHECKBOX_MIN_PT = 6.0
_CHECKBOX_MAX_PT = 16.0
_CHECKBOX_ASPECT_TOL = 0.25

_CELL_MIN_W_PT = 28.0
_CELL_MAX_W_PT = 360.0
_CELL_MIN_H_PT = 10.0
_CELL_MAX_H_PT = 36.0

# Romanian admin forms overwhelmingly use dot/underscore "leader" runs to
# mark fillable blanks. PyMuPDF returns these as words like "________" or
# "..........." (occasionally fused with surrounding text).
# - LEADER_MIN_CHARS: 3 catches short fields like the `___` next to "bl",
#   "sc", "ap" on Romanian address lines. False-positives from `etc...` or
#   `...nr...` get filtered by LEADER_MIN_WIDTH_PT instead.
# - LEADER_MIN_WIDTH_PT: 10 pt is roughly 4 chars at the 10pt font Romanian
#   forms use. Below that we're almost certainly looking at body-text
#   ellipsis, not a fillable blank.
_PLACEHOLDER_CHARS = '._⋯…¨'
_LEADER_MIN_CHARS = 3
_LEADER_MIN_WIDTH_PT = 10.0


@dataclass
class Word:
    text: str
    x: float
    y: float
    w: float
    h: float


@dataclass
class Shape:
    id: int
    kind: str        # 'underline' | 'checkbox' | 'cell'
    x: float
    y: float
    w: float
    h: float


@dataclass
class PageStructure:
    page_index: int
    width_pt: float
    height_pt: float
    words: list[Word]
    shapes: list[Shape]


def extract(pdf_path: str) -> list[PageStructure]:
    doc = fitz.open(pdf_path)
    pages: list[PageStructure] = []
    next_shape_id = 0
    try:
        for i, page in enumerate(doc):
            raw_words = _extract_words(page)
            words, leader_shapes, next_shape_id = _split_leaders(raw_words, next_shape_id)
            vector_shapes, next_shape_id = _extract_shapes(page, next_shape_id)
            shapes = leader_shapes + vector_shapes
            pages.append(PageStructure(
                page_index=i,
                width_pt=float(page.rect.width),
                height_pt=float(page.rect.height),
                words=words,
                shapes=shapes,
            ))
    finally:
        doc.close()
    return pages


def _extract_words(page) -> list[Word]:
    out: list[Word] = []
    for x0, y0, x1, y1, text, *_ in page.get_text('words'):
        text = (text or '').strip()
        if not text:
            continue
        out.append(Word(
            text=text,
            x=round(float(x0), 2),
            y=round(float(y0), 2),
            w=round(float(x1 - x0), 2),
            h=round(float(y1 - y0), 2),
        ))
    return out


def _split_leaders(
    words: list[Word], next_id: int,
) -> tuple[list[Word], list[Shape], int]:
    """Promote whole-word and embedded dot/underscore runs into shapes.

    A single uniform pass: every word is scanned for maximal leader
    runs. Each run that is long enough (chars + pt-width) becomes an
    underline shape. The remaining text fragments stay as words. This
    handles both standalone placeholders (`___________`) and fused
    forms (`CNP___________posesor`, `bl___`, `__________nr____`)
    without needing a separate whole-word fast path.
    """
    out_words: list[Word] = []
    leaders: list[Shape] = []
    for w in words:
        n = len(w.text)
        if n == 0:
            continue
        px_per_char = w.w / n
        runs = _find_leader_runs(w.text, px_per_char)
        if not runs:
            out_words.append(w)
            continue

        cursor = 0
        for (s, e) in runs:
            if s > cursor:
                frag = w.text[cursor:s].strip()
                if frag:
                    out_words.append(Word(
                        text=frag,
                        x=round(w.x + cursor * px_per_char, 2),
                        y=w.y,
                        w=round((s - cursor) * px_per_char, 2),
                        h=w.h,
                    ))
            # Underline shape sits at the bottom of the text bbox, max
            # ~2 pt tall. Width matches the leader-run's pt-width exactly.
            shape_h = min(w.h, 2.0)
            leaders.append(Shape(
                id=next_id,
                kind='underline',
                x=round(w.x + s * px_per_char, 2),
                y=round(w.y + w.h - shape_h, 2),
                w=round((e - s) * px_per_char, 2),
                h=round(shape_h, 2),
            ))
            next_id += 1
            cursor = e
        if cursor < n:
            frag = w.text[cursor:].strip()
            if frag:
                out_words.append(Word(
                    text=frag,
                    x=round(w.x + cursor * px_per_char, 2),
                    y=w.y,
                    w=round((n - cursor) * px_per_char, 2),
                    h=w.h,
                ))
    return out_words, leaders, next_id


def _find_leader_runs(text: str, px_per_char: float) -> list[tuple[int, int]]:
    """Return [(start_idx, end_idx_exclusive)] for every placeholder run
    that's long enough by both char count and pt-width."""
    runs: list[tuple[int, int]] = []
    n = len(text)
    i = 0
    while i < n:
        if text[i] in _PLACEHOLDER_CHARS:
            j = i
            while j < n and text[j] in _PLACEHOLDER_CHARS:
                j += 1
            run_len = j - i
            run_width = run_len * px_per_char
            if run_len >= _LEADER_MIN_CHARS and run_width >= _LEADER_MIN_WIDTH_PT:
                runs.append((i, j))
            i = j
        else:
            i += 1
    return runs


def _extract_shapes(page, next_id: int) -> tuple[list[Shape], int]:
    raw: list[Shape] = []
    for d in page.get_drawings():
        for item in d.get('items', []):
            op = item[0]
            if op == 'l':
                shape = _line_to_shape(item[1], item[2], next_id)
                if shape:
                    raw.append(shape)
                    next_id += 1
            elif op == 're':
                shape = _rect_to_shape(item[1], next_id)
                if shape:
                    raw.append(shape)
                    next_id += 1
    deduped, next_id = _dedupe(raw, next_id)
    return deduped, next_id


def _line_to_shape(p1, p2, next_id: int) -> Shape | None:
    dx = abs(p2.x - p1.x)
    dy = abs(p2.y - p1.y)
    if dy > _HORIZONTAL_TOL_PT or dx < _MIN_LINE_LEN_PT:
        return None
    x0 = min(p1.x, p2.x)
    y0 = min(p1.y, p2.y)
    return Shape(
        id=next_id, kind='underline',
        x=round(float(x0), 2), y=round(float(y0), 2),
        w=round(float(dx), 2), h=round(max(float(dy), 0.5), 2),
    )


def _rect_to_shape(rect, next_id: int) -> Shape | None:
    w, h = float(rect.width), float(rect.height)
    if (_CHECKBOX_MIN_PT <= w <= _CHECKBOX_MAX_PT
            and _CHECKBOX_MIN_PT <= h <= _CHECKBOX_MAX_PT
            and abs(w - h) / max(w, h) <= _CHECKBOX_ASPECT_TOL):
        return Shape(
            id=next_id, kind='checkbox',
            x=round(float(rect.x0), 2), y=round(float(rect.y0), 2),
            w=round(w, 2), h=round(h, 2),
        )
    if (_CELL_MIN_W_PT <= w <= _CELL_MAX_W_PT
            and _CELL_MIN_H_PT <= h <= _CELL_MAX_H_PT):
        return Shape(
            id=next_id, kind='cell',
            x=round(float(rect.x0), 2), y=round(float(rect.y0), 2),
            w=round(w, 2), h=round(h, 2),
        )
    return None


def _dedupe(shapes: list[Shape], next_id: int) -> tuple[list[Shape], int]:
    out: list[Shape] = []
    for s in shapes:
        if any(t.kind == s.kind
               and abs(t.x - s.x) < 2 and abs(t.y - s.y) < 2
               and abs(t.w - s.w) < 2 and abs(t.h - s.h) < 2
               for t in out):
            continue
        out.append(s)
    # Renumber so ids are contiguous after dedup (the LLM gets confused by gaps).
    for i, s in enumerate(out, start=next_id - len(shapes)):
        s.id = i
    return out, next_id


# ── Convenience: pack a page into compact dicts for prompting ───────────────

def page_to_prompt_dict(p: PageStructure) -> dict:
    """Compact representation. Word coords rounded to int because the LLM
    doesn't need sub-pt precision to choose a label."""
    return {
        'page_index': p.page_index,
        'page_width': round(p.width_pt, 1),
        'page_height': round(p.height_pt, 1),
        'words': [{'t': w.text, 'x': int(w.x), 'y': int(w.y),
                   'w': int(w.w), 'h': int(w.h)} for w in p.words],
        'shapes': [{'id': s.id, 'kind': s.kind,
                    'x': int(s.x), 'y': int(s.y),
                    'w': int(s.w), 'h': int(s.h)} for s in p.shapes],
    }
