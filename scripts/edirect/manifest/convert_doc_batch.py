# Phase 0 — DOC/RTF text extraction via LibreOffice (batched).
#
# build_manifest.py stages unique DOC/RTF files as manifest/stage/<md5>.<ext>.
# This script converts them to UTF-8 txt in batches (LibreOffice struggles with
# very long arg lists; ONE instance at a time on this machine — it locks a
# profile), moves the results into manifest/text/<md5>.txt, and patches
# manifest.json textExtractPath/textLen.
#
# Run:  PYTHONIOENCODING=utf-8 python convert_doc_batch.py
# Resumable: already-converted stage files are removed; rerun continues.

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
STAGE = HERE / "stage"
TEXT = HERE / "text"
OUT = HERE / "soffice-out"
MANIFEST = HERE / "manifest.json"
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else 200
TIMEOUT = int(sys.argv[2]) if len(sys.argv) > 2 else 1800

OUT.mkdir(exist_ok=True)


def main():
    pending = sorted(p for p in STAGE.iterdir() if p.suffix.lower() in (".doc", ".rtf"))
    print(f"pending: {len(pending)}")
    done = failed = 0

    for i in range(0, len(pending), BATCH):
        batch = pending[i : i + BATCH]
        cmd = [
            SOFFICE, "--headless", "--norestore",
            "--convert-to", "txt:Text (encoded):UTF8",
            "--outdir", str(OUT),
        ] + [str(p) for p in batch]
        print(f"batch {i // BATCH + 1}: {len(batch)} files ...", flush=True)
        try:
            subprocess.run(cmd, capture_output=True, timeout=TIMEOUT, check=False)
        except subprocess.TimeoutExpired:
            print("  batch timed out; continuing with what converted")
        for p in batch:
            txt = OUT / (p.stem + ".txt")
            if txt.exists() and txt.stat().st_size > 0:
                target = TEXT / (p.stem + ".txt")
                # LibreOffice emits UTF-8 per the filter; normalize read/write
                content = txt.read_text(encoding="utf-8", errors="replace")
                target.write_text(content, encoding="utf-8")
                txt.unlink()
                p.unlink()
                done += 1
            else:
                failed += 1
        print(f"  progress: converted={done} failed-so-far={failed}", flush=True)

    # patch manifest
    if MANIFEST.exists():
        m = json.loads(MANIFEST.read_text(encoding="utf-8"))
        patched = 0
        for u in m["uniqueDocs"]:
            if u["textExtractPath"] is None and u["exts"][0] in ("doc", "rtf"):
                t = TEXT / f"{u['md5']}.txt"
                if t.exists():
                    u["textExtractPath"] = f"text/{u['md5']}.txt"
                    u["textLen"] = t.stat().st_size
                    patched += 1
                else:
                    u["extractError"] = u.get("extractError") or "soffice-convert-failed"
        MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"manifest patched: {patched} unique docs now have text")

    print(f"done: converted={done} failed={failed} remaining-staged={len(list(STAGE.iterdir()))}")


if __name__ == "__main__":
    sys.exit(main())
