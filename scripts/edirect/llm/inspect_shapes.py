#!/usr/bin/env python3
"""Print a compact, label-friendly view of a struct.json.

For each shape on each page, prints the nearest readable text to the
LEFT on the same line, plus the words directly ABOVE with x-overlap.
That's the same proximity strategy the paddle pipeline uses for label
association. Output goes to stdout in a tab-separated table that's
much smaller than the raw struct.json — easy to read in a chat session
and curate into a labels.json.

Usage:
  python inspect_shapes.py <struct.json>
  python inspect_shapes.py <struct.json> --page 0
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


_BASELINE_TOL = 6.0   # underline-y vs text-baseline-y tolerance, pt
_LINE_HEIGHT = 14.0   # used to find the line above when no baseline match
_X_NEAR_TOL = 200.0   # how far left we scan within a candidate line
_X_OVERLAP_SLOP = 8.0


def words_on_underline_line(shape: dict, words: list[dict]) -> list[dict]:
    """Words whose baseline is at the same y as the underline.

    Romanian admin forms typically place an underline right at the
    baseline of the text line it belongs to: e.g. "Subsemnatul/a, ___,
    deținător/oare al/a". The underline's y in top-left coords roughly
    equals the text's y + text's h. So matching by baseline alignment
    catches the label line whether the blank is at the start, middle,
    or end of that line."""
    out = []
    for w in words:
        baseline = w['y'] + w['h']
        if abs(baseline - shape['y']) <= _BASELINE_TOL:
            out.append(w)
    return out


def words_on_line_above(shape: dict, words: list[dict]) -> list[dict]:
    """Words on the line just above the underline-line. Useful when the
    label is stacked above the blank rather than inline."""
    target_baseline_min = shape['y'] - _LINE_HEIGHT - _BASELINE_TOL
    target_baseline_max = shape['y'] - _LINE_HEIGHT + _BASELINE_TOL
    out = []
    for w in words:
        baseline = w['y'] + w['h']
        if target_baseline_min <= baseline <= target_baseline_max:
            out.append(w)
    return out


def label_from_words(shape: dict, words: list[dict]) -> str:
    """Pick words to the LEFT of the shape that form a plausible label
    prefix. Stop at the first big gap walking right-to-left, to avoid
    pulling in unrelated content from earlier on the same line."""
    if not words:
        return ''
    s_left = shape['x']
    # Keep only words ending before (or just under) the shape's left edge.
    candidates = [w for w in words if w['x'] + w['w'] <= s_left + 2]
    if not candidates:
        return ''
    candidates.sort(key=lambda w: w['x'])
    # Take from the rightmost candidate leftward, stopping at the first
    # gap > 30 pt (Romanian inline-label words sit close together).
    chosen = [candidates[-1]]
    for w in reversed(candidates[:-1]):
        prev = chosen[-1]
        gap = prev['x'] - (w['x'] + w['w'])
        if gap > 30:
            break
        chosen.append(w)
    chosen.reverse()
    return ' '.join(w['t'] for w in chosen)


def label_from_words_x_overlap(shape: dict, words: list[dict]) -> str:
    """Pick all words on the line whose x-range overlaps the shape — used
    for the line-above strategy (labels that sit stacked above the blank)."""
    if not words:
        return ''
    s_left = shape['x']
    s_right = shape['x'] + shape['w']
    chosen = []
    for w in words:
        wright = w['x'] + w['w']
        if wright < s_left - _X_OVERLAP_SLOP:
            continue
        if w['x'] > s_right + _X_OVERLAP_SLOP:
            continue
        chosen.append(w)
    chosen.sort(key=lambda w: w['x'])
    return ' '.join(w['t'] for w in chosen)


def main() -> int:
    ap = argparse.ArgumentParser(description='Compact view of a struct.json.')
    ap.add_argument('struct_json', help='Path to <stem>.struct.json')
    ap.add_argument('--page', type=int, default=None,
                    help='Limit to this page index (default: all pages)')
    args = ap.parse_args()

    data = json.loads(Path(args.struct_json).read_text(encoding='utf-8'))
    pages = data['pages']

    for page in pages:
        if args.page is not None and page['page_index'] != args.page:
            continue
        print(f'=== Page {page["page_index"]} '
              f'({int(page["page_width"])}x{int(page["page_height"])} pt) ===')
        words = page['words']
        for s in page['shapes']:
            on_line = words_on_underline_line(s, words)
            above = words_on_line_above(s, words)
            inline_label = label_from_words(s, on_line)
            stacked_label = label_from_words_x_overlap(s, above)
            # When inline label is empty but we have stacked text, that's
            # the label; otherwise inline wins.
            parts = []
            if inline_label:
                parts.append(f'inline: {inline_label!r}')
            if stacked_label and stacked_label != inline_label:
                parts.append(f'above: {stacked_label!r}')
            note = '  '.join(parts) if parts else '(no nearby text)'
            print(f'{s["id"]:>4}  {s["kind"]:<9} '
                  f'y={s["y"]:>4} x={s["x"]:>4}-{s["x"]+s["w"]:>4}  '
                  f'{note}')
        print()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
