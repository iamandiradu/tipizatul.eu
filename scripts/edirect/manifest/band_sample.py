# Threshold calibration helper — prints every match in a score band.
# Usage: python band_sample.py 0.3 0.75
import json
import math
import sys
from collections import Counter
from pathlib import Path

from match_archetypes import HERE, MANIFEST, REFDIR, fold, grams, idf_weight, norm, cosine

lo, hi = float(sys.argv[1]), float(sys.argv[2])

m = json.loads(MANIFEST.read_text(encoding="utf-8"))
cands = [u for u in m["uniqueDocs"]
         if u["classification"] and u["classification"]["route"] in ("R2", "R4", "R5")
         and u.get("textExtractPath") and (u.get("textLen") or 0) >= 100]
doc_vecs = []
df = Counter()
for u in cands:
    g = grams(fold((HERE / u["textExtractPath"]).read_text(encoding="utf-8", errors="replace")[:20000]))
    doc_vecs.append(g)
    df.update(g.keys())
idf = {t: math.log(len(cands) / dfc) for t, dfc in df.items()}
refs = {}
for p in sorted(REFDIR.glob("*.txt")):
    w = idf_weight(grams(fold(p.read_text(encoding="utf-8"))), idf)
    refs[p.stem] = (w, norm(w))
for u, g in zip(cands, doc_vecs):
    w = idf_weight(g, idf)
    n = norm(w)
    sc, spec = max((cosine(w, rw, n, rn), s) for s, (rw, rn) in refs.items())
    if lo <= sc < hi:
        head = " ".join((HERE / u["textExtractPath"]).read_text(encoding="utf-8", errors="replace")[:130].split())
        print(f"{sc:.2f} {spec:30s} {u['copies'][0][:80]}")
        print(f"       {head[:120]}")
