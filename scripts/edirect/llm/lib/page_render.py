"""Render PDF pages to PNG bytes for vision-LLM input.

Separate from paddle/lib/pdf_render.py because the LLM path wants PNG
bytes (encodable as base64), not numpy BGR. Each function is small
enough that duplication is cheaper than sharing.
"""

from __future__ import annotations

from dataclasses import dataclass

import fitz


@dataclass
class RenderedPage:
    page_index: int
    png_bytes: bytes
    width_pt: float
    height_pt: float
    width_px: int
    height_px: int


def render_pages(pdf_path: str, dpi: int = 150) -> list[RenderedPage]:
    """150 DPI is the default — Qwen2.5-VL sees ~1280×1800 px at this DPI
    for an A4 page, which fits comfortably under the 1280-edge image
    budget and keeps inference fast. Bump to 200 only if small fonts
    are being missed."""
    doc = fitz.open(pdf_path)
    scale = dpi / 72.0
    matrix = fitz.Matrix(scale, scale)
    out: list[RenderedPage] = []
    try:
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            rect = page.rect
            out.append(RenderedPage(
                page_index=i,
                png_bytes=pix.tobytes('png'),
                width_pt=float(rect.width),
                height_pt=float(rect.height),
                width_px=int(pix.width),
                height_px=int(pix.height),
            ))
    finally:
        doc.close()
    return out


def extract_text_tokens(pdf_path: str) -> set[str]:
    """Coarse set of lowercase tokens from the PDF's extractable text.

    Used to sanity-check LLM-proposed labels: a label the model invented
    out of thin air won't appear in this set. Tokens are stripped of
    punctuation and normalised to lowercase; we don't care about
    diacritics for membership (the model sometimes drops them)."""
    doc = fitz.open(pdf_path)
    tokens: set[str] = set()
    try:
        for page in doc:
            for raw in page.get_text().split():
                t = ''.join(c for c in raw if c.isalnum()).lower()
                if len(t) >= 2:
                    tokens.add(t)
                    # Also add diacritic-folded variant.
                    tokens.add(_fold_diacritics(t))
    finally:
        doc.close()
    return tokens


_FOLD_MAP = str.maketrans({
    'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ş': 's', 'ț': 't', 'ţ': 't',
})


def _fold_diacritics(s: str) -> str:
    return s.translate(_FOLD_MAP)
