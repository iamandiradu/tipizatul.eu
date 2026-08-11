# Phase 1 — regenerate routing-review.md from the classified manifest.
# (route_rules.py re-classifies from scratch; this only reports.)
#
# Run:  PYTHONIOENCODING=utf-8 python emit_review.py

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
REVIEW = HERE / "routing-review.md"


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    us = m["uniqueDocs"]
    total = len(us)

    counts = Counter()
    file_counts = Counter()
    for u in us:
        c = u["classification"]
        counts[(c["route"], c["confidence"])] += 1
        file_counts[c["route"]] += len(u["copies"])
    by_route = Counter()
    for (r, _), n in counts.items():
        by_route[r] += n

    lines = [
        "# Routing review — Phase 1 complete (rules + LLM pass)",
        "",
        f"_Generated 2026-07-08. {total} unique docs, {sum(file_counts.values())} catalog files, 100% routed._",
        "",
        "Routes: R0 original AcroForm · R2 archetype match · R3 national model (new spec needed)",
        "· R4 one-off authorable · R5 detection overlay · R6 scan · R7 excluded (not a form).",
        "",
        "## Route × confidence (unique docs; last column = catalog files incl. duplicates)",
        "",
        "| route | high | medium | low | unique | files |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for r in sorted(by_route):
        h = counts.get((r, "high"), 0)
        md = counts.get((r, "medium"), 0)
        lo = counts.get((r, "low"), 0)
        lines.append(f"| {r} | {h} | {md} | {lo} | {by_route[r]} | {file_counts[r]} |")
    lines.append(f"| **total** | | | | **{total}** | **{sum(file_counts.values())}** |")

    # R3 national-model candidates grouped by archetypeGuess — Phase 3 input
    lines += ["", "## R3 national-model candidates (Phase 3 authoring queue)", ""]
    guesses = defaultdict(list)
    for u in us:
        c = u["classification"]
        if c["route"] == "R3":
            guesses[c.get("archetypeGuess", "?")].append(u)
    for g, docs in sorted(guesses.items(), key=lambda kv: -sum(len(d["copies"]) for d in kv[1])):
        files = sum(len(d["copies"]) for d in docs)
        lines.append(f"- **{g}** — {len(docs)} unique / {files} files · e.g. `{docs[0]['copies'][0][:90]}`")

    # R2 archetype distribution
    lines += ["", "## R2 archetype matches", ""]
    arch = Counter()
    archfiles = Counter()
    for u in us:
        c = u["classification"]
        if c["route"] == "R2":
            a = c.get("archetypeGuess", "?")
            arch[a] += 1
            archfiles[a] += len(u["copies"])
    for a, n in arch.most_common():
        lines.append(f"- `{a}` — {n} unique / {archfiles[a]} files")

    # Low-confidence per route
    lines += ["", "## Low-confidence calls (skim these)", ""]
    for route in sorted(by_route):
        lows = [u for u in us if u["classification"]["route"] == route
                and u["classification"]["confidence"] == "low"]
        if not lows:
            continue
        lines.append(f"### {route} — {len(lows)} low-confidence")
        lines.append("")
        for u in lows[:60]:
            c = u["classification"]
            lines.append(f"- `{u['copies'][0][:100]}` ({len(u['copies'])}×) — {c['reason'][:90]}")
        if len(lows) > 60:
            lines.append(f"- … and {len(lows) - 60} more (manifest.json)")
        lines.append("")

    # Full R7 list — Radu must sign off exclusions (gate requirement)
    r7 = [u for u in us if u["classification"]["route"] == "R7"]
    lines += [f"## R7 exclusions — FULL LIST for sign-off ({len(r7)} unique docs)", ""]
    for u in sorted(r7, key=lambda x: -len(x["copies"])):
        c = u["classification"]
        lines.append(f"- `{u['copies'][0][:100]}` ({len(u['copies'])}×) — {c['reason'][:90]}")

    REVIEW.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {REVIEW} ({len(lines)} lines)")


if __name__ == "__main__":
    sys.exit(main())
