# Phase 1 — rule-based routing (FULL-EDITABILITY-ROADMAP.md §5, §6 Phase 1 step 1).
#
# Assigns every unique doc a route R0–R7 + confidence where rules are
# decisive; leaves the undecided middle as classification:null for the LLM
# batch (Phase 1 step 2). Writes results into manifest.json
# (uniqueDocs[].classification) and emits routing-review.md.
#
# Run:  PYTHONIOENCODING=utf-8 python route_rules.py

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
REVIEW = HERE / "routing-review.md"

IMG_EXTS = {"jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff"}


def fold(s: str) -> str:
    """Lowercase, fold diacritics (both cedilla and comma-below), collapse space."""
    s = s.lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\s+", " ", s)
    return s


BLANK_RUN = re.compile(r"\.{4,}|_{3,}|…{2,}|(\. ){4,}")
FORM_STEM = re.compile(r"subsemnat|solicit|cerere|declar")
CHECKBOX = re.compile(r"☐|□|▢|\[ \]|\|¯\|")
NOTFORM_TITLE = re.compile(
    r"\b(metodologie|procedura|ordin(ul)?\b|regulament|lege[a]?\b|hotarare|anunt|"
    r"calendar|instructiuni|ghid(ul)?\b|norme|plan(ul)? de|raport|situatia|lista|"
    r"program(ul)?\b|extras|circulara)"
)
OUTPUT_DOC_TITLE = re.compile(
    r"^(certificat|adeverinta|autorizatie|aviz|atestat|dovada|diploma|permis|licenta)\b"
)
SEMNATURA = re.compile(r"semnatur")

# Duplicate-group / filename → known archetype (roadmap §2 table).
ARCHETYPE_BY_NAME = [
    (re.compile(r"cerere tip solicitant"), "cerere-dsp-model-3"),
    (re.compile(r"cerere tip catre dsp"), "cerere-dsp-model-2"),
    (re.compile(r"declaratie[- ]consimtamant"), "declaratie-consimtamant"),
    (re.compile(r"tabel nominal cu autovehicul"), "tabel-nominal-auto"),
    (re.compile(r"tabel nominal cu persoanele"), "tabel-nominal-persoane"),
    (re.compile(r"declaratie gdpr"), "declaratie-gdpr"),
    (re.compile(r"acordul pentru prelucrarea datelor"), "acord-prelucrare-date"),
    (re.compile(r"consimtamant.*prelucrarea datelor|prelucrarea datelor.*consimtamant"),
     "acord-prelucrare-date"),
    (re.compile(r"cerere.*legea (nr\.? ?)?544|544.*liber acces"), "cerere-544"),
    (re.compile(r"model.*petitie|petitie model|^petitie\b"), "petitie"),
    (re.compile(r"cerere.*cazier"), "cerere-cazier"),
    (re.compile(r"cerere.*atestare fiscala|itl[ -]?010"), "cerere-atestare-fiscala"),
    (re.compile(r"cerere.*alocatie de stat|alocatie.*copii"), "cerere-alocatie-copii"),
    (re.compile(r"imputernicire"), "imputernicire"),
    (re.compile(r"contract.*comodat"), "contract-comodat"),
]

# National-model candidates spotted in the roadmap (R3 — need a spec).
R3_BY_NAME = [
    (re.compile(r"cerere tip_3092|aviz.*zona de frontiera|zona de frontiera.*aviz"), "igpf-aviz-frontiera"),
]

ROMANIAN_LETTERS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
                       "ăâîșțĂÂÎȘȚşţŞŢ")


def mojibake_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    bad = sum(1 for c in letters if c not in ROMANIAN_LETTERS)
    return bad / len(letters)


def classify(u: dict, text: str | None):
    """Return classification dict or None (undecided → LLM batch)."""
    ext = u["exts"][0]
    stem = fold(Path(u["copies"][0]).stem)

    def C(route, conf, reason, archetype=None):
        c = {"route": route, "confidence": conf, "reason": reason}
        if archetype:
            c["archetypeGuess"] = archetype
        return c

    # deterministic by container
    if ext == "xlsx":
        return C("R7", "high", "xlsx data table (roadmap §5 default)")
    if ext in IMG_EXTS:
        return C("R7", "high", "image file")
    if u.get("extractError") == "encrypted":
        return C("R6", "medium", "encrypted PDF — extraction refused")

    # R0: original AcroForm
    if ext == "pdf" and u.get("hasAcroForm"):
        return C("R0", "high", "PDF already carries an AcroForm (verify §8.2)")

    ftext = fold(text) if text else ""
    tlen = len(ftext)

    # scans / empty extracts
    if ext == "pdf" and (tlen < 50):
        return C("R6", "high", "no text layer (scan)")
    if ext in ("doc", "docx", "rtf") and tlen < 50:
        return C("R6", "medium", "near-empty text extract (embedded scan in Word?)")
    if text and mojibake_ratio(text) > 0.02:
        return C("R6", "low", "mojibake extraction (>2% non-Romanian letters) — unreliable text")

    # known archetype by name
    for rx, arch in ARCHETYPE_BY_NAME:
        if rx.search(stem):
            return C("R2", "high", f"filename matches archetype '{arch}'", arch)
    for rx, model in R3_BY_NAME:
        if rx.search(stem) or (ftext and rx.search(ftext[:300])):
            return C("R3", "high", f"known national-model candidate '{model}'", model)

    title = ftext[:400]
    has_blank = bool(BLANK_RUN.search(text or ""))
    has_stem = bool(FORM_STEM.search(ftext))
    has_checkbox = bool(CHECKBOX.search(text or ""))
    has_sig = bool(SEMNATURA.search(ftext[-2500:])) if ftext else False
    pages = u.get("pageCount")
    long_doc = (pages or 0) > 4 or tlen > 15000

    notform_title = bool(NOTFORM_TITLE.search(fold(Path(u['copies'][0]).stem))) or \
        bool(NOTFORM_TITLE.search(title))

    # strong not-a-form
    if notform_title and not has_blank and not has_stem:
        return C("R7", "high", "title + content signal non-form (methodology/order/info)")
    if long_doc and not has_blank and not has_stem and not has_checkbox:
        return C("R7", "medium", "long dense text, zero form signals")
    if notform_title and long_doc and not has_blank:
        return C("R7", "medium", "non-form title, long text, no blanks")

    # output documents the institution issues (only when no form language)
    if OUTPUT_DOC_TITLE.match(title.strip()) and not has_stem and not has_blank:
        return C("R7", "low", "looks like an output document (certificate/authorisation)")

    # strong form
    form_score = sum([has_blank, has_stem, has_checkbox, has_sig, (pages or 9) <= 3])
    if form_score >= 3:
        if "subsemnat" in ftext and tlen < 6000 and not has_checkbox:
            return C("R4", "medium", "simple linear form (subsemnat → fields → semnatura)")
        return C("R4" if tlen < 6000 else "R5", "low",
                 f"form signals={form_score}; length {tlen} decides author-vs-detect")

    return None  # undecided → LLM batch


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    uniques = m["uniqueDocs"]

    # filename-stem fan-out across institutions (cheap R3 signal, recorded only)
    stem_insts = defaultdict(set)
    for u in uniques:
        p = Path(u["copies"][0])
        stem = fold(re.sub(r"_\d+$", "", p.stem))
        for c in u["copies"]:
            stem_insts[stem].add(c.split("/")[0])

    counts = Counter()
    undecided = []
    for u in uniques:
        text = None
        if u.get("textExtractPath"):
            tp = HERE / u["textExtractPath"]
            if tp.exists():
                text = tp.read_text(encoding="utf-8", errors="replace")
        c = classify(u, text)
        if c:
            stem = fold(re.sub(r"_\d+$", "", Path(u["copies"][0]).stem))
            if c["route"] in ("R2", "R4", "R5") and len(stem_insts[stem]) >= 3:
                c["fanOutInstitutions"] = len(stem_insts[stem])
                c["nationalModelCandidate"] = True
            u["classification"] = c
            counts[(c["route"], c["confidence"])] += 1
        else:
            u["classification"] = None
            undecided.append(u)
            counts[("undecided", "-")] += 1

    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")

    # summary
    total = len(uniques)
    print(f"unique docs: {total}")
    by_route = Counter()
    for (r, conf), n in counts.items():
        by_route[r] += n
    for r in sorted(by_route):
        print(f"  {r}: {by_route[r]}")

    # routing-review.md — low-confidence + undecided, grouped by route
    lines = ["# Routing review — Phase 1 rule pass",
             "",
             f"_Generated 2026-07-08 from manifest.json ({total} unique docs)._",
             "",
             "## Route × confidence",
             "", "| route | high | medium | low | total |", "|---|---:|---:|---:|---:|"]
    for r in sorted(by_route):
        h = counts.get((r, "high"), 0)
        md = counts.get((r, "medium"), 0)
        lo = counts.get((r, "low"), 0)
        lines.append(f"| {r} | {h} | {md} | {lo} | {by_route[r]} |")
    lines += ["", "## Low-confidence calls (for Radu to skim)", ""]
    for route in ["R0", "R2", "R3", "R4", "R5", "R6", "R7"]:
        lows = [u for u in uniques
                if u["classification"] and u["classification"]["route"] == route
                and u["classification"]["confidence"] == "low"]
        if not lows:
            continue
        lines.append(f"### {route} — {len(lows)} low-confidence")
        lines.append("")
        for u in lows[:80]:
            c = u["classification"]
            lines.append(f"- `{u['copies'][0]}` ({len(u['copies'])}×) — {c['reason']}")
        if len(lows) > 80:
            lines.append(f"- … and {len(lows) - 80} more (see manifest.json)")
        lines.append("")
    lines.append(f"## Undecided → LLM batch: {len(undecided)}")
    lines.append("")
    for u in undecided[:40]:
        lines.append(f"- `{u['copies'][0]}` ({len(u['copies'])}×)")
    if len(undecided) > 40:
        lines.append(f"- … and {len(undecided) - 40} more")
    REVIEW.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {REVIEW}")


if __name__ == "__main__":
    sys.exit(main())
