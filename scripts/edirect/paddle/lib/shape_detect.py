"""Find form-like shapes in a rendered page image: horizontal underlines
and small empty squares (checkboxes / digit boxes).

Dot-leader detection happens later in field_assemble — those come from OCR
text items whose content is mostly `.` or `_`, which is far more reliable
than trying to find dot patterns in pixels.
"""

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Shape:
    kind: str              # 'underline' | 'checkbox'
    x: int                 # image pixels, top-left origin
    y: int
    w: int
    h: int
    conf: float            # geometric quality of detection


# Tuned at 200 DPI. At that scale, 1 PDF point ≈ 2.78 px.
# Underlines on Romanian forms are typically 0.5–1pt thick, 30+ pt wide.
UNDERLINE_MIN_W_PX = 60
UNDERLINE_MAX_H_PX = 4

# Checkboxes are 8–14 pt squares → ~22–40 px at 200 DPI.
CHECKBOX_MIN_PX = 18
CHECKBOX_MAX_PX = 45
CHECKBOX_ASPECT_TOL = 0.25   # max relative diff between w and h


def detect_shapes(image_bgr: np.ndarray) -> list[Shape]:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    # Adaptive threshold copes with shaded backgrounds (some scans have
    # mild gradients). THRESH_BINARY_INV → ink becomes white, paper black,
    # which is what morphology + connected-components expect.
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY_INV,
        25, 10,
    )

    shapes: list[Shape] = []
    shapes.extend(_detect_underlines(binary))
    shapes.extend(_detect_checkboxes(binary))
    return _dedupe(shapes)


def _detect_underlines(binary: np.ndarray) -> list[Shape]:
    """Long thin horizontal runs. Morphology with a wide-but-short kernel
    keeps only horizontal lines (suppresses text glyphs and vertical strokes)."""
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out: list[Shape] = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w >= UNDERLINE_MIN_W_PX and h <= UNDERLINE_MAX_H_PX and w / max(h, 1) >= 15:
            # Confidence rises with length (longer = more clearly a fill line).
            conf = min(0.7 + (w - UNDERLINE_MIN_W_PX) / 600.0, 0.95)
            out.append(Shape(kind='underline', x=x, y=y, w=w, h=h, conf=conf))
    return out


def _detect_checkboxes(binary: np.ndarray) -> list[Shape]:
    """Small empty squares. Empty interior matters — a filled black square
    is a printed bullet, not a checkbox."""
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out: list[Shape] = []
    H, W = binary.shape
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if not (CHECKBOX_MIN_PX <= w <= CHECKBOX_MAX_PX): continue
        if not (CHECKBOX_MIN_PX <= h <= CHECKBOX_MAX_PX): continue
        if abs(w - h) / max(w, h) > CHECKBOX_ASPECT_TOL: continue

        # Reject filled rectangles: a real checkbox is mostly empty inside.
        # Sample a 3-px-inset interior and check fill ratio.
        pad = 3
        if y + pad >= H or x + pad >= W: continue
        interior = binary[y + pad:y + h - pad, x + pad:x + w - pad]
        if interior.size == 0: continue
        fill_ratio = (interior > 0).sum() / interior.size
        if fill_ratio > 0.4: continue   # filled = bullet/glyph, not a checkbox

        # Reject if it's mostly hollow (no border at all — could be noise).
        if fill_ratio < 0.005 and (w < CHECKBOX_MIN_PX + 4): continue

        out.append(Shape(kind='checkbox', x=x, y=y, w=w, h=h, conf=0.80))
    return out


def _dedupe(shapes: list[Shape]) -> list[Shape]:
    """Drop near-duplicate boxes that nested contour detection sometimes emits."""
    out: list[Shape] = []
    for s in shapes:
        keep = True
        for t in out:
            if t.kind != s.kind: continue
            if abs(t.x - s.x) < 6 and abs(t.y - s.y) < 6 and abs(t.w - s.w) < 6 and abs(t.h - s.h) < 6:
                keep = False
                break
        if keep:
            out.append(s)
    return out
