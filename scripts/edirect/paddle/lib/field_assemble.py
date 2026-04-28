"""Combine OCR text items + detected shapes into labeled form fields.

Two sources of fields:

  1. OCR text items whose content is mostly `.` or `_` — these are typed
     dot/underscore leaders (the dominant pattern on Romanian admin forms).
  2. Visual underline/checkbox shapes from shape_detect.

For each field we find the nearest non-placeholder OCR text item to the left
(same line) or above (overlapping x-range), then clean it into a label.
"""

from dataclasses import dataclass, field as dc_field

from .paddle_ocr import TextItem
from .shape_detect import Shape


# A text item is a "placeholder" (i.e. the rendered field itself, not a label)
# when it's mostly dots, underscores, or middle-dots.
_PLACEHOLDER_CHARS = '._⋯…¨ '


@dataclass
class RawField:
    """Field in image-pixel coordinates, before PDF-coord conversion."""
    kind: str                # 'text' | 'checkbox'
    source: str              # 'dot_leader' | 'underscore_leader' | 'underline' | 'checkbox'
    x: int
    y: int
    w: int
    h: int
    label: str | None
    label_conf: float        # OCR confidence of the chosen label, or 0
    detection_conf: float    # geometric/textual quality of the field itself
    confidence: float = dc_field(init=False)

    def __post_init__(self):
        # Combined score. Both signals matter:
        # - if the field detection is rock-solid but no label found, the field
        #   is still useful (we just give it a generic name)
        # - a clean label on a so-so detection is probably still real
        if self.label:
            self.confidence = 0.6 * self.detection_conf + 0.4 * self.label_conf
        else:
            self.confidence = 0.7 * self.detection_conf   # 30% penalty for no label


def assemble_fields(text_items: list[TextItem], shapes: list[Shape]) -> list[RawField]:
    placeholders, labels = _partition_text(text_items)

    fields: list[RawField] = []
    fields.extend(_fields_from_placeholders(placeholders))
    fields.extend(_fields_from_shapes(shapes))

    # Drop overlapping duplicates (e.g. an underline drawn beneath a dot leader
    # would otherwise produce two fields for the same blank).
    fields = _dedupe_overlapping(fields)

    # Pair each field with its best label from the readable text items.
    for f in fields:
        label_item = _find_label(f, labels)
        if label_item:
            f.label = _clean_label(label_item.text)
            f.label_conf = label_item.confidence
        # Re-trigger combined-score calc now that label is set.
        f.__post_init__()

    return fields


# ── Partition OCR items into "placeholder" vs "real label text" ─────────────

def _partition_text(items: list[TextItem]) -> tuple[list[TextItem], list[TextItem]]:
    placeholders, labels = [], []
    for item in items:
        if _is_placeholder(item.text):
            placeholders.append(item)
        elif _is_readable(item.text):
            labels.append(item)
    return placeholders, labels


def _is_placeholder(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 4:
        return False
    placeholder_count = sum(1 for c in stripped if c in _PLACEHOLDER_CHARS)
    return placeholder_count / len(stripped) > 0.7


def _is_readable(text: str) -> bool:
    """Heuristic: at least 60% of chars are Latin letters/digits/Romanian
    diacritics. Filters out garbled OCR output and pure punctuation."""
    if len(text) < 2:
        return False
    readable = sum(
        1 for c in text
        if c.isalnum() or c in 'ăâîșțĂÂÎȘȚşţŞŢ .,:;?!()/-\'"'
    )
    return readable / len(text) >= 0.6


# ── Field generation ────────────────────────────────────────────────────────

def _fields_from_placeholders(items: list[TextItem]) -> list[RawField]:
    out: list[RawField] = []
    for item in items:
        # Distinguish dot vs underscore for diagnostics. Field type is 'text'
        # in both cases.
        if '_' in item.text and item.text.count('_') >= 4:
            source = 'underscore_leader'
        else:
            source = 'dot_leader'
        # Detection confidence scales with leader length. A 4-dot run could
        # easily be punctuation; a 30-dot run is unambiguous.
        run_len = len(item.text.strip())
        det_conf = min(0.55 + run_len / 80.0, 0.92)
        out.append(RawField(
            kind='text',
            source=source,
            x=item.x,
            y=item.y,
            w=item.w,
            h=item.h,
            label=None,
            label_conf=0.0,
            detection_conf=det_conf,
        ))
    return out


def _fields_from_shapes(shapes: list[Shape]) -> list[RawField]:
    out: list[RawField] = []
    for s in shapes:
        kind = 'checkbox' if s.kind == 'checkbox' else 'text'
        out.append(RawField(
            kind=kind,
            source=s.kind,
            x=s.x,
            y=s.y,
            w=s.w,
            h=s.h,
            label=None,
            label_conf=0.0,
            detection_conf=s.conf,
        ))
    return out


# ── Dedup & label association ───────────────────────────────────────────────

def _dedupe_overlapping(fields: list[RawField]) -> list[RawField]:
    """If two fields overlap by >50% area, keep the one with higher detection
    confidence. A common case: dot-leader text + an underline rect drawn under
    it → same field, two detections."""
    fields = sorted(fields, key=lambda f: f.detection_conf, reverse=True)
    kept: list[RawField] = []
    for f in fields:
        if any(_overlap_ratio(f, k) > 0.5 for k in kept):
            continue
        kept.append(f)
    return kept


def _overlap_ratio(a: RawField, b: RawField) -> float:
    ix0 = max(a.x, b.x)
    iy0 = max(a.y, b.y)
    ix1 = min(a.x + a.w, b.x + b.w)
    iy1 = min(a.y + a.h, b.y + b.h)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    smallest = min(a.w * a.h, b.w * b.h)
    return inter / smallest if smallest > 0 else 0.0


# Tuned for 200 DPI rendering.
_Y_TOL_PX = 22         # "same line" tolerance
_LEFT_MAX_PX = 600     # how far left to search for a label
_ABOVE_MAX_PX = 70     # how far up to search


def _find_label(field: RawField, labels: list[TextItem]) -> TextItem | None:
    field_cy = field.y + field.h / 2

    # Strategy 1: closest readable text whose right edge sits to the LEFT of
    # the field on the same line. This matches forms like "Nume: ........"
    best = None
    best_dist = float('inf')
    for label in labels:
        label_cy = label.y + label.h / 2
        if abs(label_cy - field_cy) > _Y_TOL_PX: continue
        label_right = label.x + label.w
        # Allow a small overlap (label might tuck slightly past field's left edge).
        gap = field.x - label_right
        if gap < -20 or gap > _LEFT_MAX_PX: continue
        if gap < best_dist:
            best_dist = gap
            best = label

    if best:
        return best

    # Strategy 2: nearest readable text immediately ABOVE, with horizontal
    # overlap. Catches stacked layouts ("Adresa\n............").
    best_above = None
    best_above_dist = float('inf')
    for label in labels:
        vert = (field.y) - (label.y + label.h)
        if vert < 0 or vert > _ABOVE_MAX_PX: continue
        # Must overlap horizontally.
        label_right = label.x + label.w
        field_right = field.x + field.w
        if label_right < field.x - 30 or label.x > field_right + 30: continue
        if vert < best_above_dist:
            best_above_dist = vert
            best_above = label

    return best_above


def _clean_label(text: str) -> str:
    """Trim trailing punctuation and leading list-item numbering."""
    cleaned = ' '.join(text.split())
    # Strip leading "1.", "2)", etc.
    while cleaned and cleaned[0].isdigit():
        # Look for "<digits>[.)]" prefix
        i = 0
        while i < len(cleaned) and cleaned[i].isdigit():
            i += 1
        if i < len(cleaned) and cleaned[i] in '.)':
            cleaned = cleaned[i + 1:].lstrip()
            continue
        break
    # Strip trailing colons, dots, semicolons.
    cleaned = cleaned.rstrip(' :;,.…')
    return cleaned.strip()
