# Top 20 Romanian form archetypes — "rewrite, don't overlay"

Premise (Radu's): most catalog forms are a shared root template with thin
per-institution customization (institution name + logo, occasionally an extra
field or footer). Instead of detecting where to drop inputs onto a scanned PDF,
we author each **archetype** once as a fillable AcroForm PDF with the inputs
already in place, and stamp the institution name/logo as per-instance slots.

## How this list was built

1. **Catalog frequency** — normalized all 8,477 download filenames (stripped
   `_<id>.<ext>`, transliterated diacritics) and counted base names. See the
   raw counts in the conversation; the dominant clusters are reproduced below.
2. **Google cross-reference** — the most-used Romanian administrative templates
   per [IndexOficial](https://indexoficial.ro/formulare-modele/),
   [Avocățel](https://avocatel.ro/generator-documente), ANAF's
   [form index](https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Toateformularele/Toate_Formularele.html),
   and [ModelActe](https://modelacte.ro/declaratie-pe-propria-raspundere/).

Rank blends catalog frequency (how much rewriting it saves us) with Google
ubiquity (how universal the layout is). `catalog≈` = approx. matching files.

| # | Archetype | `id` | catalog≈ | In catalog? | Notes |
|---|-----------|------|---------:|-------------|-------|
| 1 | Cerere tip (cerere generică către o instituție) | `cerere-tip` | 950 + 245 | ✅ heavy | The universal request. **Built ✔** |
| 2 | Cerere simplă / liberă | `cerere` | 448 | ✅ heavy | Same skeleton as #1, freeform body. **Built ✔** |
| 3 | Cerere tip către DSP (direcția de sănătate publică) | `cerere-dsp` | 197 + 38 | ✅ | Superseded for farma by the national replicas `cerere-dsp-model-2`/`-3` (Legea 266/2008). **Built ✔✔✔** |
| 4 | Declarație-consimțământ (prelucrare date / GDPR) | `declaratie-consimtamant` | 145 | ✅ | Consent checkbox + signatory block. **Built ✔** |
| 5 | Declarație GDPR (informare prelucrare date) | `declaratie-gdpr` | 54 | ✅ | Sibling of #4. **Built ✔** |
| 6 | Acord prelucrare date cu caracter personal | `acord-prelucrare-date` | 41 | ✅ | Sibling of #4/#5. **Built ✔** |
| 7 | Declarație pe propria răspundere | `declaratie-proprie-raspundere` | many¹ | ⚠️ embedded | Universal; standalone. **Built ✔** |
| 8 | Cerere și declarație pe propria răspundere | `cerere-si-declaratie` | 41 | ✅ | #1 + #7 combined. **Built ✔** |
| 9 | Cerere de recunoaștere (diplome/titluri) | `cerere-recunoastere` | 41 | ✅ | #1 + recognition fields. **Built ✔** |
| 10 | Tabel nominal cu persoanele | `tabel-nominal-persoane` | 50 | ✅ | Repeating-row table. **Built ✔** |
| 11 | Tabel nominal cu autovehiculele | `tabel-nominal-auto` | 46 | ✅ | Repeating-row table. **Built ✔** |
| 12 | Cerere eliberare certificat (profesional/curent) | `cerere-eliberare-certificat` | 39 | ✅ | #1 + certificate fields. **Built ✔** |
| 13 | Împuternicire / procură specială | `imputernicire` | low | ❌ create | Two-party, `partyBlock`. **Built ✔** |
| 14 | Cerere certificat de atestare fiscală | `cerere-atestare-fiscala` | low | ⚠️ partial | Replica of national „Model 2016 ITL 010". **Built ✔** |
| 15 | Cerere în baza Legii 544/2001 (info public) | `cerere-544` | low | ❌ create | Per HG 123/2002 model. **Built ✔** |
| 16 | Petiție / reclamație (Legea 233/2002 OG 27) | `petitie` | low | ❌ create | Structure from the ADR catalog form. **Built ✔** |
| 17 | Contract de comodat | `contract-comodat` | low | ❌ create | Two-party, art. 2146–2157 CC. **Built ✔** |
| 18 | Cerere alocație de stat pentru copii | `cerere-alocatie-copii` | low | ⚠️ partial | Per Anexa nr. 1 (Legea 61/1993). **Built ✔** |
| 19 | Cerere concediu creștere copil | `cerere-concediu-crestere` | low | ⚠️ partial | Către angajator, OUG 111/2010. **Built ✔** |
| 20 | Cerere eliberare cazier judiciar | `cerere-cazier` | low | ⚠️ partial | Per the MAI form (Legea 290/2004). **Built ✔** |

¹ "Declarație pe propria răspundere" rarely appears as a standalone filename but
is embedded in dozens of bundled cereri; counted as universal.

## What this saves

Templates #1–#3, #8, #9, #12 (≈1,750 catalog files) share the **cerere
skeleton**: header (logo + institution + title) → applicant identity block
(nume, CNP, domiciliu, contact) → request body → date + signature. Authoring
that skeleton once and parameterizing the institution slot replaces field
detection on ~1,750 scanned/Word documents.

## Slot model

Every archetype takes a per-institution **instance**:

```jsonc
{
  "institutionName": "Primăria Comunei Exemplu",   // baked as static header text
  "logoPath": "path/to/logo.png",                   // optional; baked top-left
  "addressLine": "Str. Exemplu nr. 1, jud. Exemplu" // optional sub-header
}
```

If `institutionName` is omitted, the header becomes an **editable AcroForm text
field** instead of baked text — so the same base template degrades gracefully
to a generic, end-user-fillable form.

## Build order (recommendation)

1. **`cerere-tip`** ✅ (done — the slice). Validates the author → fill pipeline.
2. ✅ **done** — `cerere`, `cerere-dsp`, `cerere-si-declaratie`,
   `cerere-recunoastere`, `cerere-eliberare-certificat`. All reuse the cerere
   skeleton via `specs/_shared.mjs#identityBlock`.
3. ✅ **done** — `declaratie-consimtamant`, `declaratie-gdpr`,
   `acord-prelucrare-date`, `declaratie-proprie-raspundere`. The declaration
   skeleton via `specs/_shared.mjs#declarantBlock` + the `checkbox` primitive;
   institution rendered as the *data operator* slot.
4. `tabel-nominal-*` — needs the repeating-row helper (new layout primitive).
5. `imputernicire`, `cerere-544`, `petitie`, `contract-comodat` — author from
   the legally standardized text (no catalog source to match).
