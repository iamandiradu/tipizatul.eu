# Phase 2 — adjudicate the 0.35-0.75 eyeball queue with content rules.
#
# The gray band decomposes into known patterns (calibrated by hand
# 2026-07-08, see match-report.md): true ITL 010 instances whose headers
# depress the score, and three national models the matcher surfaced that
# need new Phase 3 specs (DSP Model 4 / Model 7, Legea 544 formular-tip,
# 544 reclamația administrativă). Everything else keeps its matchCandidate
# for Radu's skim.
#
# Run:  PYTHONIOENCODING=utf-8 python adjudicate_queue.py

import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"


def fold(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if not unicodedata.combining(c)))


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    n = {"r2_itl010": 0, "r3": 0, "kept": 0}
    for u in m["uniqueDocs"]:
        c = u["classification"]
        if not c or "matchCandidate" not in c:
            continue
        text = ""
        if u.get("textExtractPath") and (HERE / u["textExtractPath"]).exists():
            text = fold((HERE / u["textExtractPath"]).read_text(encoding="utf-8", errors="replace")[:4000])
        cand = c["matchCandidate"]

        def to_r3(slug, why):
            u["classification"] = {"route": "R3", "confidence": "high", "archetypeGuess": slug,
                                   "nationalModelCandidate": True,
                                   "reason": f"adjudicated from match queue: {why}",
                                   "matchCandidate": cand}
            n["r3"] += 1

        if "modelul nr. 7" in text and "colegiul farmacist" in text:
            to_r3("dsp-model-7-colegiu", "DSP Modelul nr. 7 (dovadă transmitere Colegiul Farmaciștilor)")
        elif "modelul nr. 4" in text and ("ministerul sanatatii" in text or "farmaceutic" in text):
            to_r3("dsp-model-4", "DSP Modelul nr. 4 (Legea 266/2008 order)")
        elif "reclamatie administrativa" in text and "544" in text:
            to_r3("reclamatie-administrativa-544", "Legea 544 reclamație administrativă annex model")
        elif ("544" in text or "informatii de interes public" in text) and \
                ("formular" in text or "cerere-tip" in text or "anexa" in text) and \
                cand["spec"] == "cerere-544":
            to_r3("formular-544-solicitare", "Legea 544 formular-tip annex (replica needed for exact fidelity)")
        elif cand["spec"] == "cerere-atestare-fiscala" and \
                ("atestare fiscala" in text or "itl 010" in text or "itl - 010" in text):
            if "juridic" in text and "fizic" not in text.split("juridic")[0][-200:] and "persoane fizice" not in text:
                to_r3("cerere-atestare-fiscala-pj", "PJ variant of ITL atestare cerere (ITL 010 spec is PF)")
            else:
                u["classification"] = {"route": "R2", "confidence": "high",
                                       "archetypeGuess": "cerere-atestare-fiscala",
                                       "matchScore": cand["score"],
                                       "reason": "adjudicated: ITL 010 / Anexa nr. 10 instance (header noise depressed score)"}
                n["r2_itl010"] += 1
        else:
            n["kept"] += 1
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
    print(n)


if __name__ == "__main__":
    sys.exit(main())
