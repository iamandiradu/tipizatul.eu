# Phase 1 step 2 — package undecided unique docs into classification batches.
#
# Each batch file (manifest/llm-batches/batch-NNN.json) carries up to 60 docs:
# {md5, file, institution, copies, textHead} where textHead is the first 1500
# chars of the extract. A classifier (Claude subagent or API batch) reads one
# batch and returns manifest/llm-batches/batch-NNN.result.json:
#   [{md5, route, archetypeGuess?, isNationalModel?, confidence, reason}]
# apply_llm_results.py merges results back into manifest.json.
#
# Run:  PYTHONIOENCODING=utf-8 python make_llm_batches.py

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
BATCH_DIR = HERE / "llm-batches"
BATCH_SIZE = 60
HEAD = 1500


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    undecided = [u for u in m["uniqueDocs"] if u["classification"] is None]
    print(f"undecided: {len(undecided)}")
    BATCH_DIR.mkdir(exist_ok=True)
    for old in BATCH_DIR.glob("batch-*.json"):
        if ".result." not in old.name:
            old.unlink()

    for bi in range(0, len(undecided), BATCH_SIZE):
        batch = []
        for u in undecided[bi : bi + BATCH_SIZE]:
            head = ""
            if u.get("textExtractPath"):
                tp = HERE / u["textExtractPath"]
                if tp.exists():
                    head = tp.read_text(encoding="utf-8", errors="replace")[:HEAD]
            batch.append({
                "md5": u["md5"],
                "file": u["copies"][0],
                "institution": u["copies"][0].split("/")[0],
                "copies": len(u["copies"]),
                "textHead": head,
            })
        out = BATCH_DIR / f"batch-{bi // BATCH_SIZE:03d}.json"
        out.write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
    n = (len(undecided) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"wrote {n} batch files to {BATCH_DIR}")


if __name__ == "__main__":
    sys.exit(main())
