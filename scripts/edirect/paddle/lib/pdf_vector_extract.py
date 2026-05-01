"""Born-digital PDF extractor: reads text + vector graphics directly from
the content stream via PyMuPDF. ~100× faster than the OCR path on clean
digital PDFs and produces pixel-perfect rectangles, no OCR errors.

Output is structurally identical to the OCR path (lib/paddle_ocr.ocr_image
+ lib/shape_detect.detect_shapes): TextItem and Shape lists in pseudo-pixel
coordinates at the same DPI as the OCR path, so field_assemble.py
thresholds tuned for the OCR path work unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass

import fitz

from .paddle_ocr import TextItem
from .shape_detect import Shape


_DEFAULT_DPI = 200
_PT_PER_INCH = 72.0

# Stroke-line thresholds (PDF points, BEFORE scaling to pixels).
# A "horizontal" line drifts < this much vertically over its length; this
# absorbs anti-aliasing-induced sub-pt errors but rejects diagonals.
_HORIZONTAL_TOL_PT = 1.0
# Lines shorter than this are nearly always decorative — a short underscore
# beneath a heading, a tick mark, a divider segment. Real fillable underlines
# need to fit at least a few characters of input.
_MIN_LINE_LEN_PT = 50.0

# Small filled-square / checkbox thresholds (PDF points).
_CHECKBOX_MIN_PT = 6.0
_CHECKBOX_MAX_PT = 16.0
_CHECKBOX_ASPECT_TOL = 0.25

# Cell rectangle thresholds (PDF points). Cap the width so we don't pick up
# decorative full-page-width boxes (footnotes, headers, table containers).
_CELL_MIN_W_PT = 28.0
_CELL_MAX_W_PT = 360.0
_CELL_MIN_H_PT = 10.0
_CELL_MAX_H_PT = 36.0


@dataclass
class VectorPage:
    page_index: int
    text_items: list[TextItem]
    shapes: list[Shape]
    width_pt: float
    height_pt: float
    scale: float            # pixels per PDF point


def is_born_digital(pdf_path: str) -> bool:
    """Heuristic: extractable text on every page + no big embedded images."""
    doc = fitz.open(pdf_path)
    try:
        text_chars = 0
        big_image_pages = 0
        for page in doc:
            text_chars += len(page.get_text().strip())
            for img in page.get_images(full=True):
                try:
                    w, h = img[2], img[3]
                except Exception:
                    continue
                if w * h > 500 * 500:
                    big_image_pages += 1
                    break
        n = max(doc.page_count, 1)
    finally:
        doc.close()
    chars_per_page = text_chars / n
    image_ratio = big_image_pages / n
    # Looser than the corpus-survey threshold — we'd rather use the vector
    # path on a borderline PDF and fall back to OCR via dispatch escalation
    # than miss a digital doc.
    return chars_per_page >= 200 and image_ratio < 0.5


def extract_pdf(pdf_path: str, dpi: int = _DEFAULT_DPI) -> list[VectorPage]:
    scale = dpi / _PT_PER_INCH
    doc = fitz.open(pdf_path)
    pages: list[VectorPage] = []
    try:
        for i, page in enumerate(doc):
            pages.append(VectorPage(
                page_index=i,
                text_items=_extract_words(page, scale),
                shapes=_extract_shapes(page, scale),
                width_pt=float(page.rect.width),
                height_pt=float(page.rect.height),
                scale=scale,
            ))
    finally:
        doc.close()
    return pages


def _extract_words(page, scale: float) -> list[TextItem]:
    """PyMuPDF returns words as (x0, y0, x1, y1, text, block, line, word) in
    PDF points (top-left origin)."""
    items: list[TextItem] = []
    for x0, y0, x1, y1, text, *_ in page.get_text("words"):
        if not text or not text.strip():
            continue
        items.append(TextItem(
            text=text,
            confidence=1.0,
            x=int(round(x0 * scale)),
            y=int(round(y0 * scale)),
            w=int(round((x1 - x0) * scale)),
            h=int(round((y1 - y0) * scale)),
        ))
    return items


def _extract_shapes(page, scale: float) -> list[Shape]:
    shapes: list[Shape] = []
    for d in page.get_drawings():
        for item in d.get("items", []):
            op = item[0]
            if op == "l":
                shape = _line_to_shape(item[1], item[2], scale)
                if shape:
                    shapes.append(shape)
            elif op == "re":
                shape = _rect_to_shape(item[1], scale)
                if shape:
                    shapes.append(shape)
    return _dedupe_shapes(shapes)


def _line_to_shape(p1, p2, scale: float) -> Shape | None:
    dx = abs(p2.x - p1.x)
    dy = abs(p2.y - p1.y)
    if dy <= _HORIZONTAL_TOL_PT and dx >= _MIN_LINE_LEN_PT:
        x0 = min(p1.x, p2.x)
        y0 = min(p1.y, p2.y)
        return Shape(
            kind='underline',
            x=int(round(x0 * scale)),
            y=int(round(y0 * scale)),
            w=int(round(dx * scale)),
            h=max(1, int(round(max(dy, 0.5) * scale))),
            conf=0.95,
        )
    return None


def _rect_to_shape(rect, scale: float) -> Shape | None:
    w_pt, h_pt = rect.width, rect.height
    if (_CHECKBOX_MIN_PT <= w_pt <= _CHECKBOX_MAX_PT
            and _CHECKBOX_MIN_PT <= h_pt <= _CHECKBOX_MAX_PT
            and abs(w_pt - h_pt) / max(w_pt, h_pt) <= _CHECKBOX_ASPECT_TOL):
        return Shape(
            kind='checkbox',
            x=int(round(rect.x0 * scale)),
            y=int(round(rect.y0 * scale)),
            w=int(round(w_pt * scale)),
            h=int(round(h_pt * scale)),
            conf=0.92,
        )
    if (_CELL_MIN_W_PT <= w_pt <= _CELL_MAX_W_PT
            and _CELL_MIN_H_PT <= h_pt <= _CELL_MAX_H_PT):
        return Shape(
            kind='cell',
            x=int(round(rect.x0 * scale)),
            y=int(round(rect.y0 * scale)),
            w=int(round(w_pt * scale)),
            h=int(round(h_pt * scale)),
            conf=0.92,
        )
    return None


def _dedupe_shapes(shapes: list[Shape]) -> list[Shape]:
    """Drop near-duplicate shapes — vector content sometimes draws the same
    line twice (e.g. once for stroke, once for fill mask)."""
    out: list[Shape] = []
    for s in shapes:
        if any(t.kind == s.kind
               and abs(t.x - s.x) < 4 and abs(t.y - s.y) < 4
               and abs(t.w - s.w) < 4 and abs(t.h - s.h) < 4
               for t in out):
            continue
        out.append(s)
    return out
