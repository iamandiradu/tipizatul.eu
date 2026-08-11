# Phase 1 step 2 — merge llm-batches/batch-*.result.json back into manifest.json.
#
# Result rows: {md5, route: "R0".."R7", archetypeGuess?, isNationalModel?,
# confidence: high|medium|low, reason}. Rows referencing unknown md5s or
# already-classified docs are reported, not applied.
#
# Run:  PYTHONIOENCODING=utf-8 python apply_llm_results.py

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
BATCH_DIR = HERE / "llm-batches"

VALID_ROUTES = {f"R{i}" for i in range(8)}
VALID_CONF = {"high", "medium", "low"}


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_md5 = {u["md5"]: u for u in m["uniqueDocs"]}
    applied = skipped = bad = 0
    for rf in sorted(BATCH_DIR.glob("batch-*.result.json")):
        rows = json.loads(rf.read_text(encoding="utf-8"))
        for r in rows:
            u = by_md5.get(r.get("md5"))
            if not u or r.get("route") not in VALID_ROUTES or r.get("confidence") not in VALID_CONF:
                bad += 1
                print(f"  BAD row in {rf.name}: {json.dumps(r, ensure_ascii=False)[:160]}")
                continue
            if u["classification"] is not None:
                skipped += 1
                continue
            c = {
                "route": r["route"],
                "confidence": r["confidence"],
                "reason": f"llm: {r.get('reason', '')[:300]}",
                "source": "llm",
            }
            if r.get("archetypeGuess"):
                c["archetypeGuess"] = r["archetypeGuess"]
            if r.get("isNationalModel"):
                c["nationalModelCandidate"] = True
            u["classification"] = c
            applied += 1
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
    remaining = sum(1 for u in m["uniqueDocs"] if u["classification"] is None)
    print(f"applied={applied} skipped(already classified)={skipped} bad={bad} still-undecided={remaining}")


if __name__ == "__main__":
    sys.exit(main())
