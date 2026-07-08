# Phase 0 — corpus manifest builder (FULL-EDITABILITY-ROADMAP.md §6 Phase 0)
#
# Walks scripts/edirect/downloads/, md5s every file, groups into unique docs,
# extracts text (PyMuPDF for PDF, document.xml strip for DOCX; DOC/RTF are
# staged for a separate LibreOffice batch pass — see convert_doc_batch.py),
# and writes manifest/manifest.json.
#
# Run:  PYTHONIOENCODING=utf-8 python build_manifest.py
# Resumable: text extracts already present under manifest/text/ are skipped.

import hashlib
import html
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path

import fitz  # PyMuPDF

fitz.TOOLS.mupdf_display_errors(False)

HERE = Path(__file__).resolve().parent
# \\?\ extended-length prefix: without it Windows MAX_PATH silently drops
# 74 corpus files whose full path exceeds 260 chars (the 2026-07-02 census
# had the same blind spot — true corpus is 8,477 files, not 8,403).
DOWNLOADS = Path("\\\\?\\" + str(HERE.parent / "downloads"))
TEXT_DIR = HERE / "text"
STAGE_DIR = HERE / "stage"          # unique DOC/RTF copies named <md5>.<ext>
MANIFEST = HERE / "manifest.json"

TEXT_DIR.mkdir(exist_ok=True)
STAGE_DIR.mkdir(exist_ok=True)

DOCID_RE = re.compile(r"_(\d+)\.[^.]+$")
MAX_TEXT = 60_000  # cap stored extract length

IMG_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff"}


def md5_of(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_text(t: str) -> str:
    t = t.replace("­", "").replace("​", "").replace(" ", " ")
    return t


def extract_pdf(path: Path):
    """Return (text, page_count, has_acroform, error)."""
    try:
        doc = fitz.open(str(path))
        if doc.needs_pass:
            return None, doc.page_count, False, "encrypted"
        has_form = bool(doc.is_form_pdf)
        parts = []
        total = 0
        for page in doc:
            t = page.get_text()
            parts.append(t)
            total += len(t)
            if total > MAX_TEXT:
                break
        pc = doc.page_count
        doc.close()
        return clean_text("".join(parts))[:MAX_TEXT], pc, has_form, None
    except Exception as e:  # noqa: BLE001
        return None, None, False, f"pdf-open-failed: {e}"


DEL_RE = re.compile(r"<w:del\b[^>]*>.*?</w:del>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def extract_docx(path: Path):
    try:
        with zipfile.ZipFile(path) as z:
            xml = z.read("word/document.xml").decode("utf-8", "ignore")
    except Exception as e:  # noqa: BLE001
        return None, f"docx-open-failed: {e}"
    xml = DEL_RE.sub("", xml)                       # drop tracked deletions
    xml = re.sub(r"<w:tab[^>]*/>", "\t", xml)
    xml = xml.replace("</w:p>", "\n").replace("</w:tc>", " | ")
    text = TAG_RE.sub("", xml)
    text = html.unescape(text)
    return clean_text(text)[:MAX_TEXT], None


def main():
    files = []
    by_md5 = {}

    all_paths = sorted(DOWNLOADS.rglob("*"))
    file_paths = [p for p in all_paths if p.is_file()]
    print(f"walking {len(file_paths)} files ...")

    for i, p in enumerate(file_paths):
        if i and i % 1000 == 0:
            print(f"  hashed {i}")
        rel = p.relative_to(DOWNLOADS).as_posix()
        institution = rel.split("/")[0]
        ext = p.suffix.lower().lstrip(".")
        stem = p.stem
        m = DOCID_RE.search(p.name)
        docid = m.group(1) if m else None
        digest = md5_of(p)
        rec = {
            "path": rel,
            "institution": institution,
            "filenameStem": stem,
            "eDirectDocId": docid,
            "ext": ext,
            "md5": digest,
            "uniqueDocId": digest,
            "isDupOf": None,
        }
        if digest in by_md5:
            rec["isDupOf"] = by_md5[digest]["copies"][0]
            by_md5[digest]["copies"].append(rel)
            if ext not in by_md5[digest]["exts"]:
                by_md5[digest]["exts"].append(ext)
        else:
            by_md5[digest] = {
                "md5": digest,
                "exts": [ext],
                "copies": [rel],
                "textExtractPath": None,
                "pageCount": None,
                "hasAcroForm": False,
                "textLen": None,
                "extractError": None,
                "classification": None,
            }
        files.append(rec)

    uniques = list(by_md5.values())
    print(f"files={len(files)} unique={len(uniques)}")

    # --- text extraction per unique doc ---
    n_pdf = n_docx = n_staged = n_err = 0
    for i, u in enumerate(uniques):
        if i and i % 500 == 0:
            print(f"  extracted {i}/{len(uniques)} (pdf={n_pdf} docx={n_docx} staged={n_staged} err={n_err})")
        ext = u["exts"][0]
        src = DOWNLOADS / u["copies"][0]
        txt_path = TEXT_DIR / f"{u['md5']}.txt"

        if ext == "pdf":
            if txt_path.exists() and u["pageCount"] is None:
                # still need metadata even if text cached
                pass
            text, pc, has_form, err = extract_pdf(src)
            u["pageCount"] = pc
            u["hasAcroForm"] = has_form
            u["extractError"] = err
            if text is not None:
                if not txt_path.exists():
                    txt_path.write_text(text, encoding="utf-8")
                u["textExtractPath"] = f"text/{u['md5']}.txt"
                u["textLen"] = len(text)
                n_pdf += 1
            else:
                n_err += 1
        elif ext == "docx":
            if not txt_path.exists():
                text, err = extract_docx(src)
                if err:
                    u["extractError"] = err
                    n_err += 1
                    continue
                txt_path.write_text(text, encoding="utf-8")
            u["textExtractPath"] = f"text/{u['md5']}.txt"
            u["textLen"] = txt_path.stat().st_size
            n_docx += 1
        elif ext in ("doc", "rtf"):
            if txt_path.exists():
                u["textExtractPath"] = f"text/{u['md5']}.txt"
                u["textLen"] = txt_path.stat().st_size
            else:
                staged = STAGE_DIR / f"{u['md5']}.{ext}"
                if not staged.exists():
                    shutil.copy2(src, staged)
                n_staged += 1
        elif ext == "xlsx" or f".{ext}" in IMG_EXTS:
            pass  # R7/R6 by default; no text needed
        else:
            u["extractError"] = f"unhandled-ext: {ext}"

    print(f"extraction done: pdf={n_pdf} docx={n_docx} staged-for-libreoffice={n_staged} errors={n_err}")

    manifest = {
        "generatedAt": "2026-07-08",
        "downloadsRoot": "scripts/edirect/downloads",
        "counts": {
            "files": len(files),
            "unique": len(uniques),
            "stagedDocRtf": n_staged,
        },
        "files": files,
        "uniqueDocs": uniques,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {MANIFEST}")


if __name__ == "__main__":
    sys.exit(main())
