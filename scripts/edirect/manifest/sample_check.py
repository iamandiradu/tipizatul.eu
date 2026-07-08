# Phase 1 gate — stratified 50-doc sample for manual re-check (roadmap §6 P1).
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
m = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
us = [u for u in m["uniqueDocs"] if u["classification"]]
random.seed(2026)
by_route = {}
for u in us:
    by_route.setdefault(u["classification"]["route"], []).append(u)
quota = {"R0": 4, "R2": 7, "R3": 6, "R4": 12, "R5": 6, "R6": 6, "R7": 9}
for r, n in quota.items():
    for u in random.sample(by_route[r], min(n, len(by_route[r]))):
        c = u["classification"]
        head = ""
        if u.get("textExtractPath"):
            tp = HERE / u["textExtractPath"]
            if tp.exists():
                head = " ".join(tp.read_text(encoding="utf-8", errors="replace")[:300].split())
        print(f"[{c['route']}/{c['confidence']}] {u['copies'][0][:100]}")
        print(f"   reason: {c['reason'][:95]}")
        print(f"   text: {head[:230]}")
