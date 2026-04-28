"""Render PDF pages to numpy BGR images via PyMuPDF.

Returns the rendered image plus the page's PDF-point dimensions, so downstream
code can map image pixels back to PDF coordinates (origin at bottom-left).
"""

from dataclasses import dataclass

import fitz  # PyMuPDF
import numpy as np


@dataclass
class RenderedPage:
    page_index: int
    image_bgr: np.ndarray   # shape (H, W, 3), uint8
    width_pt: float          # PDF points
    height_pt: float
    scale: float             # pixels per PDF point


def render_pdf(pdf_path: str, dpi: int = 200) -> list[RenderedPage]:
    """Render every page of pdf_path at the given DPI.

    DPI 200 is a good tradeoff: text stays crisp for OCR (Romanian diacritics
    are 6-8pt and need ~2x oversampling), and a 4-page A4 PDF stays under 50 MB
    in memory.
    """
    doc = fitz.open(pdf_path)
    scale = dpi / 72.0
    matrix = fitz.Matrix(scale, scale)
    pages: list[RenderedPage] = []
    try:
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
            # PyMuPDF gives RGB; OpenCV expects BGR
            bgr = arr[:, :, ::-1].copy()
            rect = page.rect
            pages.append(RenderedPage(
                page_index=i,
                image_bgr=bgr,
                width_pt=float(rect.width),
                height_pt=float(rect.height),
                scale=scale,
            ))
    finally:
        doc.close()
    return pages
