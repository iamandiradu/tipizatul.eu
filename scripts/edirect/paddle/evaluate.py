#!/usr/bin/env python3
"""Compare detector output against a ground-truth AcroForm PDF.

For each ground-truth widget, find the detected field with the highest IoU.
Match if IoU >= MIN_IOU. Reports precision/recall/F1 plus per-field details.

Usage:
  python evaluate.py <ground_truth.pdf> <detected.fields.json>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import fitz


MIN_IOU = 0.50


def load_ground_truth(pdf_path: Path) -> list[dict]:
    """Each widget as page-relative top-left rect."""
    doc = fitz.open(str(pdf_path))
    out: list[dict] = []
    for i, page in enumerate(doc):
        for w in (page.widgets() or []):
            r = w.rect
            out.append({
                'page': i,
                'page_height_pt': float(page.rect.height),
                'x': float(r.x0),
                'y': float(r.y0),
                'w': float(r.width),
                'h': float(r.height),
                'name': w.field_name,
                'type': w.field_type_string,
            })
    doc.close()
    return out


def load_detected(json_path: Path, page_heights: dict[int, float]) -> list[dict]:
    """Detector output uses PDF points (bottom-left origin). Convert to top-left
    to match PyMuPDF widget coords."""
    payload = json.loads(json_path.read_text(encoding='utf-8'))
    fields = payload.get('fields', [])
    out: list[dict] = []
    for f in fields:
        page = f['page']
        ph = page_heights.get(page, 841.89)
        x = f['x']
        w = f['width']
        h = f['height']
        # bottom-left → top-left
        y_top = ph - f['y'] - h
        out.append({
            'page': page,
            'x': x,
            'y': y_top,
            'w': w,
            'h': h,
            'label': f.get('label'),
            'type': f.get('type'),
            'context': f.get('context'),
            'confidence': f.get('confidence'),
        })
    return out


def iou(a: dict, b: dict) -> float:
    if a['page'] != b['page']:
        return 0.0
    ax0, ay0, ax1, ay1 = a['x'], a['y'], a['x'] + a['w'], a['y'] + a['h']
    bx0, by0, bx1, by1 = b['x'], b['y'], b['x'] + b['w'], b['y'] + b['h']
    ix0, iy0 = max(ax0, bx0), max(ay0, by0)
    ix1, iy1 = min(ax1, bx1), min(ay1, by1)
    iw, ih = max(0.0, ix1 - ix0), max(0.0, iy1 - iy0)
    inter = iw * ih
    if inter == 0:
        return 0.0
    area_a = (ax1 - ax0) * (ay1 - ay0)
    area_b = (bx1 - bx0) * (by1 - by0)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def match_greedy(gts: list[dict], dets: list[dict], min_iou: float) -> tuple[list, list, list]:
    """Greedy: pick highest-IoU pair each iteration, remove both, repeat.
    Returns (matches, unmatched_gt, unmatched_det)."""
    pairs = []
    for gi, g in enumerate(gts):
        for di, d in enumerate(dets):
            v = iou(g, d)
            if v >= min_iou:
                pairs.append((v, gi, di))
    pairs.sort(reverse=True)
    matched_gt: set[int] = set()
    matched_det: set[int] = set()
    matches = []
    for v, gi, di in pairs:
        if gi in matched_gt or di in matched_det:
            continue
        matched_gt.add(gi)
        matched_det.add(di)
        matches.append((v, gi, di))
    unmatched_gt = [i for i in range(len(gts)) if i not in matched_gt]
    unmatched_det = [i for i in range(len(dets)) if i not in matched_det]
    return matches, unmatched_gt, unmatched_det


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('truth_pdf', help='Ground-truth AcroForm PDF')
    ap.add_argument('detected_json', help='Detector output fields.json')
    ap.add_argument('--min-iou', type=float, default=MIN_IOU)
    ap.add_argument('--verbose', action='store_true')
    args = ap.parse_args()

    truth_pdf = Path(args.truth_pdf)
    det_json = Path(args.detected_json)
    if not truth_pdf.is_file() or not det_json.is_file():
        print('Missing input file', file=sys.stderr)
        return 1

    gts = load_ground_truth(truth_pdf)
    page_heights = {g['page']: g['page_height_pt'] for g in gts}
    dets = load_detected(det_json, page_heights)

    matches, fn, fp = match_greedy(gts, dets, args.min_iou)
    tp = len(matches)
    n_gt = len(gts)
    n_det = len(dets)
    precision = tp / max(n_det, 1)
    recall = tp / max(n_gt, 1)
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    print(f'Ground truth: {n_gt} widgets')
    print(f'Detected:     {n_det} fields')
    print(f'Matches @ IoU >= {args.min_iou}: {tp}')
    print(f'  Precision:  {precision:.3f}  ({tp}/{n_det})')
    print(f'  Recall:     {recall:.3f}  ({tp}/{n_gt})')
    print(f'  F1:         {f1:.3f}')
    print(f'  False pos:  {len(fp)}')
    print(f'  False neg:  {len(fn)}')

    if args.verbose:
        print('\n--- MATCHES (best IoU first) ---')
        for v, gi, di in matches:
            g, d = gts[gi], dets[di]
            print(f'  IoU={v:.2f}  page={g["page"]}  '
                  f'gt[{g["type"]:9}] {g["name"]!r}  '
                  f'<-> det[{d["type"]:8}/{d["context"]:11}] {(d["label"] or "")[:40]!r}')
        print(f'\n--- FALSE NEGATIVES (gt not detected, {len(fn)}) ---')
        for gi in fn:
            g = gts[gi]
            print(f'  page={g["page"]}  [{g["type"]:9}] {g["name"]!r:35} '
                  f'rect=({g["x"]:.0f},{g["y"]:.0f}) {g["w"]:.0f}x{g["h"]:.0f}')
        print(f'\n--- FALSE POSITIVES (det without gt match, {len(fp)}) ---')
        for di in fp:
            d = dets[di]
            print(f'  page={d["page"]}  [{d["type"]:8}/{d["context"]:11}] '
                  f'{(d["label"] or "")[:40]!r:42} '
                  f'rect=({d["x"]:.0f},{d["y"]:.0f}) {d["w"]:.0f}x{d["h"]:.0f}  conf={d["confidence"]:.2f}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
