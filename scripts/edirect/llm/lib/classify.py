"""Classify a PDF as born-digital, scan, or mixed.

A *scan* is a PDF whose content is essentially raster — typically a page
image with no extractable text. The LLM path handles both, but downstream
consumers (the admin review queue, the upload UI) want to know which is
which so they can prioritise human verification on scans.
"""

from __future__ import annotations

from dataclasses import dataclass

import fitz


# Per-page thresholds. A typical Romanian admin form has ~1000+ chars of
# extractable text on its main page even when it has a lot of form
# fields. Below 50 chars/page we're confident it's a scan.
_BORN_DIGITAL_CHARS_PER_PAGE = 200
_SCAN_CHARS_PER_PAGE = 50
# A big embedded image — say bigger than a quarter A4 at 150 DPI — on
# every page is a strong hint that the page IS an image.
_BIG_IMAGE_PX = 500 * 500


@dataclass
class PdfClassification:
    is_scan: bool          # zero/near-zero extractable text + large images
    is_born_digital: bool  # extractable text on most pages, no big images
    chars_per_page: float
    big_image_page_ratio: float

    @property
    def category(self) -> str:
        if self.is_scan:
            return 'scan'
        if self.is_born_digital:
            return 'born_digital'
        return 'mixed'


def classify(pdf_path: str) -> PdfClassification:
    doc = fitz.open(pdf_path)
    try:
        n = max(doc.page_count, 1)
        text_chars = 0
        big_image_pages = 0
        for page in doc:
            text_chars += len(page.get_text().strip())
            for img in page.get_images(full=True):
                try:
                    w, h = img[2], img[3]
                except Exception:
                    continue
                if w * h > _BIG_IMAGE_PX:
                    big_image_pages += 1
                    break
    finally:
        doc.close()

    chars_per_page = text_chars / n
    image_ratio = big_image_pages / n

    is_scan = chars_per_page < _SCAN_CHARS_PER_PAGE and image_ratio >= 0.5
    is_born_digital = (
        chars_per_page >= _BORN_DIGITAL_CHARS_PER_PAGE and image_ratio < 0.5
    )

    return PdfClassification(
        is_scan=is_scan,
        is_born_digital=is_born_digital,
        chars_per_page=chars_per_page,
        big_image_page_ratio=image_ratio,
    )
