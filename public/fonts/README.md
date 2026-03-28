# NotoSans Font Required

Place `NotoSans-Regular.ttf` in this directory.

This font is used by `pdf-lib` to embed Unicode-aware text into generated PDFs,
enabling full support for Romanian diacritics (ș ț ă â î).

## How to get the file

**Option 1 — Google Fonts (recommended):**
1. Go to https://fonts.google.com/noto/specimen/Noto+Sans
2. Click "Download family"
3. Extract the ZIP and copy `NotoSans-Regular.ttf` here

**Option 2 — npm (if you already installed @fontsource/noto-sans):**
Check `node_modules/@fontsource/noto-sans/files/` — if a `.ttf` variant is present,
copy it here as `NotoSans-Regular.ttf`.

The file is ~560 KB. It is served as a static asset by Vite and Vercel.
Add `public/fonts/NotoSans-Regular.ttf` to `.gitignore` if you prefer not to commit
binary files, and instead download it as part of your CI/CD pipeline.
