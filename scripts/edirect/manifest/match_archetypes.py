# Phase 2 step 1–2 — archetype matching at scale (roadmap §6 Phase 2).
#
# Scores every routed R2/R4/R5 unique doc against the 22 authored archetype
# reference texts (templates/specs/reference/<id>.txt, extracted from the
# built generic PDFs) using cosine similarity over folded char 3-grams.
# Diacritics folded via NFKD (handles both cedilla ş/ţ and comma-below ș/ț);
# fill markers (...., ____, ……) stripped before comparison.
#
# Modes:
#   python match_archetypes.py            # report-only: score histogram + top matches
#   python match_archetypes.py --apply T_STRONG T_WEAK
#       T_STRONG: best-score >= this → classification becomes R2 (archetype match)
#       T_WEAK:   between → matchCandidate recorded + eyeball queue entry
# Writes match-report.md either way.

import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
REFDIR = HERE.parent / "templates" / "specs" / "reference"
REPORT = HERE / "match-report.md"

FILLER = re.compile(r"[.…_]{2,}")
NONWORD = re.compile(r"[^a-z0-9 ]+")


def fold(s: str) -> str:
    s = s.lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = FILLER.sub(" ", s)
    s = NONWORD.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def grams(s: str) -> Counter:
    """Word unigrams + bigrams. Bigrams carry the discriminative legal
    phrasing; plain char 3-grams scored generic admin boilerplate too high
    (calibration 2026-07-08: the 0.6-0.75 band was mostly false matches)."""
    words = s.split()
    c = Counter(words)
    c.update(f"{words[i]} {words[i+1]}" for i in range(len(words) - 1))
    return c


def idf_weight(vec: Counter, idf: dict) -> dict:
    return {k: v * idf.get(k, 1.0) for k, v in vec.items()}


def norm(vec: dict) -> float:
    return math.sqrt(sum(v * v for v in vec.values())) or 1.0


def cosine(a: dict, b: dict, na: float, nb: float) -> float:
    if not a or not b:
        return 0.0
    if len(a) > len(b):
        a, b, na, nb = b, a, nb, na
    dot = sum(v * b[k] for k, v in a.items() if k in b)
    return dot / (na * nb)


def main():
    apply_mode = "--apply" in sys.argv
    if apply_mode:
        i = sys.argv.index("--apply")
        t_strong, t_weak = float(sys.argv[i + 1]), float(sys.argv[i + 2])

    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    cands = [u for u in m["uniqueDocs"]
             if u["classification"] and u["classification"]["route"] in ("R2", "R4", "R5")
             and u.get("textExtractPath") and (u.get("textLen") or 0) >= 100]
    print(f"{len(cands)} candidate docs (R2/R4/R5 with text)")

    # Pass 1: raw term vectors + document frequencies over the candidate corpus.
    doc_vecs = []
    df = Counter()
    for i, u in enumerate(cands):
        if i and i % 1000 == 0:
            print(f"  vectorized {i}")
        text = (HERE / u["textExtractPath"]).read_text(encoding="utf-8", errors="replace")
        g = grams(fold(text[:20000]))
        doc_vecs.append(g)
        df.update(g.keys())
    n_docs = len(cands)
    idf = {t: math.log(n_docs / dfc) for t, dfc in df.items()}

    refs = {}
    for p in sorted(REFDIR.glob("*.txt")):
        w = idf_weight(grams(fold(p.read_text(encoding="utf-8"))), idf)
        refs[p.stem] = (w, norm(w))
    print(f"{len(refs)} reference texts loaded")

    results = []
    for i, (u, g) in enumerate(zip(cands, doc_vecs)):
        if i and i % 500 == 0:
            print(f"  scored {i}")
        w = idf_weight(g, idf)
        n = norm(w)
        best_spec, best_score = None, 0.0
        for spec, (rw, rn) in refs.items():
            sc = cosine(w, rw, n, rn)
            if sc > best_score:
                best_spec, best_score = spec, sc
        results.append((u, best_spec, best_score))

    # histogram
    hist = Counter()
    for _, _, sc in results:
        hist[round(sc, 1)] += 1
    print("score histogram (best match per doc):")
    for b in sorted(hist):
        print(f"  {b:.1f}: {hist[b]}")

    applied = weak = 0
    per_spec = defaultdict(lambda: [0, 0])  # spec -> [uniques, files]
    weak_rows = []
    strong_rows = []
    for u, spec, sc in sorted(results, key=lambda r: -r[2]):
        row = f"- `{u['copies'][0][:95]}` ({len(u['copies'])}×) → **{spec}** {sc:.2f}"
        if apply_mode and sc >= t_strong:
            prev = u["classification"]
            u["classification"] = {
                "route": "R2", "confidence": "high",
                "archetypeGuess": spec, "matchScore": round(sc, 3),
                "reason": f"match: cos={sc:.2f} vs {spec} (was {prev['route']})",
            }
            per_spec[spec][0] += 1
            per_spec[spec][1] += len(u["copies"])
            applied += 1
            strong_rows.append(row)
        elif apply_mode and sc >= t_weak:
            u["classification"]["matchCandidate"] = {"spec": spec, "score": round(sc, 3)}
            weak += 1
            weak_rows.append(row)

    if apply_mode:
        MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"applied: {applied} strong (>= {t_strong}), {weak} eyeball-queue ({t_weak}-{t_strong})")

    lines = ["# Archetype match report — Phase 2", "",
             f"_{len(cands)} R2/R4/R5 docs scored against {len(refs)} archetype references._", "",
             "## Best-score histogram", ""]
    lines += [f"- {b:.1f}: {hist[b]}" for b in sorted(hist)]
    if apply_mode:
        lines += ["", f"## Strong matches applied → R2 (score ≥ {t_strong}): {applied}", ""]
        lines += strong_rows
        lines += ["", "### Per-spec totals", ""]
        for spec, (nu, nf) in sorted(per_spec.items(), key=lambda kv: -kv[1][1]):
            lines.append(f"- `{spec}` — {nu} unique / {nf} files")
        lines += ["", f"## Eyeball queue ({t_weak} ≤ score < {t_strong}): {weak}", ""]
        lines += weak_rows
    else:
        lines += ["", "## Top 60 matches (report-only run)", ""]
        lines += [f"- `{u['copies'][0][:95]}` ({len(u['copies'])}×) → **{spec}** {sc:.2f}"
                  for u, spec, sc in sorted(results, key=lambda r: -r[2])[:60]]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {REPORT}")


if __name__ == "__main__":
    sys.exit(main())
