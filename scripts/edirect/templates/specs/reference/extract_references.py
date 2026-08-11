# Phase 2 step 1 — canonical reference text per archetype spec.
#
# Extracts the text of each freshly-built generic archetype PDF
# (templates/dist/<id>.pdf) into specs/reference/<id>.txt. These are the
# texts match_archetypes.py scores corpus documents against.
#
# Run (from templates/):  PYTHONIOENCODING=utf-8 python specs/reference/extract_references.py

import sys
from pathlib import Path

import fitz

fitz.TOOLS.mupdf_display_errors(False)

HERE = Path(__file__).resolve().parent          # specs/reference
TEMPLATES = HERE.parent.parent                  # templates/
DIST = TEMPLATES / "dist"
SPECS = TEMPLATES / "specs"


def main():
    ids = sorted(p.stem for p in SPECS.glob("*.mjs") if not p.name.startswith("_"))
    n = 0
    for sid in ids:
        pdf = DIST / f"{sid}.pdf"
        if not pdf.exists():
            print(f"SKIP {sid}: dist PDF missing (run build.mjs {sid})")
            continue
        doc = fitz.open(str(pdf))
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        (HERE / f"{sid}.txt").write_text(text, encoding="utf-8")
        n += 1
    print(f"wrote {n} reference texts to {HERE}")


if __name__ == "__main__":
    sys.exit(main())
