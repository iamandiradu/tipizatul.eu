"""PaddleOCR wrapper. Romanian (`ro`) maps to PaddleOCR's Latin recognizer,
which covers ăâîșț. The OCR engine is loaded once per process — first call
downloads ~50 MB of det/rec models to ~/.paddleocr/."""

from dataclasses import dataclass

import numpy as np

_ENGINE = None


@dataclass
class TextItem:
    text: str
    confidence: float       # 0..1, PaddleOCR's text confidence
    x: int                  # axis-aligned bbox in image pixels (top-left origin)
    y: int
    w: int
    h: int


def _engine():
    global _ENGINE
    if _ENGINE is None:
        from paddleocr import PaddleOCR
        # show_log=False keeps console clean during batch runs.
        # use_angle_cls=True helps when scanned forms have slight rotation.
        _ENGINE = PaddleOCR(use_angle_cls=True, lang='ro', show_log=False)
    return _ENGINE


def ocr_image(image_bgr: np.ndarray) -> list[TextItem]:
    """Run OCR on an image, return text items with axis-aligned bboxes."""
    raw = _engine().ocr(image_bgr, cls=True)
    if not raw or not raw[0]:
        return []

    items: list[TextItem] = []
    for entry in raw[0]:
        # entry shape: [ [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], (text, confidence) ]
        poly, (text, conf) = entry
        xs = [p[0] for p in poly]
        ys = [p[1] for p in poly]
        x0, y0 = int(min(xs)), int(min(ys))
        x1, y1 = int(max(xs)), int(max(ys))
        items.append(TextItem(
            text=text,
            confidence=float(conf),
            x=x0,
            y=y0,
            w=x1 - x0,
            h=y1 - y0,
        ))
    return items
