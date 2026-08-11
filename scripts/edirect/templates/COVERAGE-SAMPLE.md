# Coverage sampling — does `cerere-tip` actually cover the "cerere tip" cluster?

_2026-07-02. Method: 50 files sampled (seed 42) from the 1,745 catalog files
whose filename matches `cerere[ _-]?tip`. Text extracted (PyMuPDF for PDF,
XML-strip for DOCX, LibreOffice for legacy DOC), each classified manually
against the authored `cerere-tip` archetype. Artifacts in
`C:/tmp/coverage-sample/` (sample.json, analysis.json)._

## Result

| Class | Meaning | n | % of extractable |
|---|---|---:|---:|
| A | Covered by `cerere-tip` as-is | 2 | ~5% |
| B | Covered with a small identity gap (CI serie/nr, born-at) | 6 | ~14% |
| C | Needs the **legal-representative/business variant** (reprezentant legal al [entitate], sediul social, CUI/ONRC) | 26 | ~59% |
| D | Genuinely structured/domain-specific (F.9 construcții, înscriere preșcolar SIIIR, tranzit auto cu tabel) | 4 | ~9% |
| E | Belongs to another built/planned archetype (petiție, ITL 010 atestare fiscală, alocație copii, recunoaștere, certificat profesional) | 6 | ~14% |
| — | Unextractable (scanned PDF, no text layer) | 6 of 50 | n/a |

Small sample: treat percentages as ±15pp (95% CI). The *structure* of the
result is robust even if the exact numbers aren't.

## The two big findings

**1. The dominant gap is a single missing variant, not twenty.** 26/44 files
open with „Subsemnatul/a …, în calitate de reprezentant legal al …, cu sediul
social …, CUI/ONRC …". One shared `representativeBlock` (declarant +
entity + sediu + CUI) turns most of class C into covered.

**2. Many "institution forms" are verbatim national models.** ~20 of the 26
C-files are the DSP „Modelul nr. 2" / „Modelul nr. 3" (Ministerul Sănătății
annex forms), byte-identical across counties. Likewise ITL 010 (atestare
fiscală) and F.9 (autorizație construire) are national standard forms. For
these, authoring the *national model* gives **exact fidelity** — better than a
generic skeleton, because the text is legally fixed. This strongly confirms
the root-template hypothesis, just one level deeper than expected: the root is
often a *national annex model*, not a generic cerere.

## Recommended follow-ups (in impact order)

1. `_shared.mjs#representativeBlock` — the legal-representative identity block.
2. `cerere-dsp-model-2` + `cerere-dsp-model-3` — replicas of the national DSP
   models (covers ~45% of this cluster alone; supersedes the generic
   `cerere-dsp` guess we authored).
3. Add CI serie/nr + născut-la options to `identityBlock` (class B → A).
4. `cerere-atestare-fiscala` as an ITL 010 replica (also class E's biggest hit).
5. Class D (~9%) + scanned files stay on the detection pipeline — accept.
