/**
 * Template author — turns a declarative ArchetypeSpec into BOTH:
 *   1. a fillable AcroForm PDF (inputs already in place), and
 *   2. the matching Template JSON the app's fill pipeline consumes.
 *
 * This is the inverse of scripts/edirect/lib/acroform-writer.mjs: instead of
 * overlaying transparent fields onto a scanned PDF, we DRAW the form ourselves
 * and place real, labeled input fields exactly where they belong. The
 * institution name + logo are per-instance "slots" — baked as static content
 * when an institution is supplied, or left as an editable field when not.
 *
 * Field naming reuses scripts/edirect/lib/romanian-patterns.mjs so authored
 * field names match the conventions the rest of the system already expects
 * (cnp → maxLength 13, telefon → phone placeholder, etc.).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { PDFDocument, PDFDict, PDFName, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

import { matchPattern } from '../../lib/romanian-patterns.mjs'

// Name under which NotoSans is registered in the AcroForm's /DR font dict and
// referenced by every text field's /DA. Without this, fields default to
// Helvetica (WinAnsi) and typing ș/ț directly into the blank PDF (Acrobat,
// Chrome) drops the glyphs — our own fill path embeds NotoSans, but a user
// editing the raw PDF gets whatever /DA names.
const FONT_ALIAS = 'NotoSans'

// Zod-compatible value patterns keyed by romanian-patterns' pattern id.
// Emitted into Template.fields[].validation so schema-builder enforces format
// in the web form (it currently only checks presence). Optional fields get the
// pattern wrapped with `^$|` in _register — schema-builder applies the regex
// before .optional(), so a blank '' would otherwise fail.
const VALIDATION_BY_PATTERN = {
  cnp: { pattern: '^\\d{13}$', customMessage: 'CNP-ul trebuie să conțină exact 13 cifre' },
  date: { pattern: '^\\d{2}\\.\\d{2}\\.\\d{4}$', customMessage: 'Format așteptat: ZZ.LL.AAAA' },
  email: { pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', customMessage: 'Adresă de e-mail invalidă' },
  phone: { pattern: '^\\+?[0-9][0-9 .\\-()]{6,17}$', customMessage: 'Număr de telefon invalid' },
  iban: { pattern: '^RO\\d{2}[A-Z0-9 ]{20,30}$', customMessage: 'IBAN invalid (începe cu RO)' },
}

const HERE = dirname(fileURLToPath(import.meta.url))
// public/fonts/NotoSans-Regular.ttf — same font the browser fill embeds, so the
// authored field appearances match the downloaded PDF exactly.
const FONT_PATH = resolve(HERE, '../../../../public/fonts/NotoSans-Regular.ttf')

// A4 portrait, in PDF points.
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 56

const INK = rgb(0.1, 0.1, 0.1)
const RULE = rgb(0.45, 0.45, 0.45)
const SLOT = rgb(0.85, 0.85, 0.85)

/**
 * Layout cursor. `y` is measured from the TOP of the page (it grows downward);
 * we convert to pdf-lib's bottom-left origin only when drawing.
 */
function topToPdfY(y, h = 0) {
  return PAGE_H - y - h
}

/**
 * @typedef {Object} FieldSpec
 * @property {string} label        Romanian label (also drives the field name)
 * @property {string} [name]       explicit pdfFieldName; defaults from label
 * @property {'text'|'checkbox'} [type='text']
 * @property {boolean} [required]
 * @property {boolean} [multiline]
 * @property {number}  [lines=1]    height in text lines (multiline only)
 * @property {number}  [maxLength]  overrides the pattern-derived cap
 * @property {string}  [placeholder]
 * @property {string}  [hint]
 * @property {string}  [group]
 */

/**
 * @typedef {Object} ArchetypeSpec
 * @property {string} id            kebab id, e.g. "cerere-tip"
 * @property {string} title         document title drawn under the header
 * @property {string} name          human template name
 * @property {string} [description]
 * @property {string} [category]
 * @property {string} [organization]  institution this replica belongs to, when
 *                                    the form is one institution's own
 * @property {string} [county]        that institution's county
 * @property {(ctx: AuthorCtx) => void} body  draws the form body
 */

/**
 * @typedef {Object} Instance
 * @property {string} [institutionName]  baked static header; omit → editable field
 * @property {string} [addressLine]      optional sub-header line
 * @property {string} [logoPath]         optional PNG/JPG logo, baked top-left
 */

class AuthorCtx {
  constructor(doc, page, form, font) {
    this.doc = doc
    this.page = page
    this.form = form
    this.font = font
    this.y = MARGIN
    this.left = MARGIN
    this.right = PAGE_W - MARGIN
    this.contentW = PAGE_W - 2 * MARGIN
    /** @type {object[]} Template.fields metadata, in render order */
    this.templateFields = []
    this._order = 0
    this._usedNames = new Set()
  }

  /**
   * Ensure `needed` points of vertical room remain on the current page; spill
   * to a fresh page when not. Primitives call this before drawing so multi-
   * field archetypes (e.g. cerere + declarație) flow onto page 2 instead of
   * drawing off the bottom edge.
   */
  ensureSpace(needed) {
    if (this.y + needed <= PAGE_H - MARGIN) return
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.y = MARGIN
  }

  /** Resolve a FieldSpec into a concrete, deduped pdfFieldName + pattern hints. */
  _resolve(spec) {
    const base = spec.name || toFieldName(spec.label)
    let name = base || `field_${this._order}`
    let n = 2
    while (this._usedNames.has(name)) name = `${base}_${n++}`
    this._usedNames.add(name)
    const pattern = matchPattern(spec.label)
    return {
      name,
      type: spec.type || 'text',
      maxLength: spec.maxLength ?? pattern?.maxLength ?? null,
      placeholder: spec.placeholder ?? pattern?.placeholder ?? undefined,
      patternId: pattern?.id ?? null,
    }
  }

  /** Register a field in the Template JSON. */
  _register(spec, resolved) {
    const v = resolved.patternId ? VALIDATION_BY_PATTERN[resolved.patternId] : undefined
    this.templateFields.push({
      pdfFieldName: resolved.name,
      type: resolved.type,
      label: spec.label,
      ...(resolved.placeholder ? { placeholder: resolved.placeholder } : {}),
      ...(spec.hint ? { hint: spec.hint } : {}),
      ...(spec.group ? { group: spec.group } : {}),
      order: this._order++,
      isRequired: Boolean(spec.required),
      ...(spec.multiline ? { isMultiline: true } : {}),
      maxLength: resolved.maxLength,
      ...(v
        ? {
            validation: {
              // Optional fields: allow the empty string, since schema-builder
              // applies the regex before .optional() and '' would fail.
              pattern: spec.required ? v.pattern : `^$|${v.pattern}`,
              customMessage: v.customMessage,
            },
          }
        : {}),
    })
  }
}

/** Transliterate + snake_case a label into a PDF field name (mirrors romanian-patterns). */
function toFieldName(label) {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ăâ]/gi, 'a').replace(/[îÎ]/gi, 'i')
    .replace(/[șşȘŞ]/gi, 's').replace(/[țţȚŢ]/gi, 't')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .substring(0, 50)
}

// ── AcroForm editability plumbing ────────────────────────────────────────────

/**
 * Register the embedded NotoSans under FONT_ALIAS in the AcroForm's /DR font
 * dict so field /DA strings can reference it. pdf-lib exposes no public API
 * for /DR, so this is low-level dict surgery on form.acroForm.dict.
 */
function registerAcroFormFont(doc, form, font) {
  const acroDict = form.acroForm.dict
  let dr = acroDict.lookupMaybe(PDFName.of('DR'), PDFDict)
  if (!dr) {
    dr = doc.context.obj({})
    acroDict.set(PDFName.of('DR'), dr)
  }
  let fonts = dr.lookupMaybe(PDFName.of('Font'), PDFDict)
  if (!fonts) {
    fonts = doc.context.obj({})
    dr.set(PDFName.of('Font'), fonts)
  }
  fonts.set(PDFName.of(FONT_ALIAS), font.ref)
}

/**
 * Post-creation pass every text field goes through: point its /DA at the
 * embedded NotoSans (so typing directly into the blank PDF renders diacritics)
 * and set the PDF-level Required flag to mirror the Template JSON.
 */
function finalizeTextField(tf, spec, fontSize) {
  tf.acroField.setDefaultAppearance(`/${FONT_ALIAS} ${fontSize} Tf 0 g`)
  if (spec.required) tf.enableRequired()
}

// ── Layout primitives ────────────────────────────────────────────────────────

/**
 * Draw the document header: optional logo slot, a horizontal rule, and the
 * centered title. The institution does NOT go here — a cerere is written BY a
 * citizen TO an institution, so the institution is the *addressee* and belongs
 * in the body's "Către …" block (see `addressee`), not in a letterhead.
 */
async function drawHeader(ctx, instance, title) {
  const { page, font } = ctx
  if (instance.logoPath) {
    try {
      const bytes = readFileSync(instance.logoPath)
      const img = /\.png$/i.test(instance.logoPath)
        ? await ctx.doc.embedPng(bytes)
        : await ctx.doc.embedJpg(bytes)
      const h = 44
      const w = (img.width / img.height) * h
      page.drawImage(img, { x: ctx.left, y: topToPdfY(ctx.y, h), width: w, height: h })
      ctx.y += h + 10
    } catch {
      // Missing/invalid logo — silently fall back to no logo.
    }
  }

  page.drawLine({
    start: { x: ctx.left, y: topToPdfY(ctx.y) },
    end: { x: ctx.right, y: topToPdfY(ctx.y) },
    thickness: 0.8, color: RULE,
  })
  ctx.y += 28

  // Centered title — wrapped, because national-model titles run long
  // (e.g. ITL 010's full legal title). Multi-line titles step down a size.
  let size = 16
  let lines = wrap(font, title, size, ctx.contentW)
  if (lines.length > 1) {
    size = 13
    lines = wrap(font, title, size, ctx.contentW)
  }
  for (const line of lines) {
    const tW = font.widthOfTextAtSize(line, size)
    page.drawText(line, {
      x: (PAGE_W - tW) / 2, y: topToPdfY(ctx.y, size), size, font, color: INK,
    })
    ctx.y += size * 1.45
  }
  ctx.y += 20
}

/**
 * The "Către …" addressee block — names the institution the cerere is sent to.
 * This is the REQUIRED institution slot: baked as static text when an
 * institution instance is supplied, or an editable required field otherwise.
 * Either way the institution name lands in the first rows of the form.
 */
function addressee(
  ctx,
  instance,
  {
    lead = 'Către,',
    label = 'Instituția',
    name = 'institutie',
    required = true,
    baked = null,
    bakedAddress = null,
  } = {},
) {
  const { font } = ctx
  const size = 11
  ctx.ensureSpace(size * 1.6 + 24)
  const page = ctx.page
  page.drawText(lead, { x: ctx.left, y: topToPdfY(ctx.y, size), size, font, color: INK })
  ctx.y += size * 1.6

  const indent = ctx.left + 16
  // `baked` wins over the instance: a replica of one institution's own form
  // (DASM Cluj's „Către, DIRECŢIA DE ASISTENŢĂ SOCIALĂ ŞI MEDICALĂ") addresses
  // that institution by construction — there is no generic version of it to
  // stamp, so the spec states the addressee rather than the build command.
  const institutionName = baked ?? instance.institutionName
  const addressLine = baked ? bakedAddress : instance.addressLine
  if (institutionName) {
    // Baked — institution + optional address line, emphasized.
    page.drawText(institutionName, {
      x: indent, y: topToPdfY(ctx.y, 13), size: 13, font, color: INK,
    })
    ctx.y += 13 * 1.5
    if (addressLine) {
      page.drawText(addressLine, {
        x: indent, y: topToPdfY(ctx.y, 9), size: 9, font, color: RULE,
      })
      ctx.y += 9 * 1.6
    }
  } else {
    // Generic base template — institution becomes an editable field.
    const spec = { label, name, required }
    const r = ctx._resolve(spec)
    const h = 16
    const tf = ctx.form.createTextField(r.name)
    tf.setText('')
    tf.addToPage(page, {
      x: indent, y: topToPdfY(ctx.y, h), width: ctx.right - indent, height: h, borderWidth: 0,
    })
    tf.setFontSize(12)
    finalizeTextField(tf, spec, 12)
    page.drawLine({
      start: { x: indent, y: topToPdfY(ctx.y + h) },
      end: { x: ctx.right, y: topToPdfY(ctx.y + h) }, thickness: 0.5, color: SLOT,
    })
    ctx._register(spec, r)
    ctx.y += h + 8
  }
  ctx.y += 10
}

/** Wrapped body paragraph. */
function paragraph(ctx, text, { size = 11, gap = 8 } = {}) {
  const { font } = ctx
  const lines = wrap(font, text, size, ctx.contentW)
  const lh = size * 1.4
  for (const line of lines) {
    ctx.ensureSpace(lh)
    ctx.page.drawText(line, { x: ctx.left, y: topToPdfY(ctx.y, size), size, font, color: INK })
    ctx.y += lh
  }
  ctx.y += gap
}

/** A "Label: ____________" line with an inline borderless text field on the rule. */
/**
 * One character per box: the `|_|_|_|` grids Romanian administrative forms use
 * for nume, prenume, CNP and serie/număr. Officials read these positionally, so
 * a replica that collapses them into a plain line loses information the form
 * is built around.
 *
 * Implemented as a single AcroForm text field with the Comb flag plus a
 * MaxLen, which is what makes a viewer distribute typed characters evenly
 * across the cells. Comb requires MaxLen — without it the flag is ignored — so
 * `cells` is the source of truth for both.
 *
 * The separators are drawn on the page rather than relying on the field
 * border, because viewers disagree about whether to render comb dividers on an
 * empty field, and the boxes must be visible on a printed blank form.
 */
function combField(ctx, spec, { cells = 13, cellW, labelW } = {}) {
  const { font } = ctx
  const size = 11
  const h = 18
  ctx.ensureSpace(h + 14)
  const page = ctx.page
  const label = spec.label + ':'
  const lw = labelW ?? font.widthOfTextAtSize(label, size) + 8
  page.drawText(label, { x: ctx.left, y: topToPdfY(ctx.y, size) - 3, size, font, color: INK })

  const fx = ctx.left + lw
  const available = ctx.right - fx
  // Shrink to fit rather than overflow the margin: a 30-cell nume grid on an
  // A4 page cannot use a comfortable cell width.
  const w = Math.min(cellW ?? 15, available / cells)
  const gridW = w * cells

  const r = ctx._resolve({ ...spec, maxLength: cells })

  // A comb grid holds exactly `cells` characters, but `_resolve` infers a
  // validation pattern from the label — and an inferred pattern can demand
  // more room than the grid has. "Data" infers ^\d{2}\.\d{2}\.\d{4}$, ten
  // characters including separators, while the printed grid is eight cells of
  // digits: the user could never satisfy it and the form could never be
  // submitted. Keep the pattern only if a full grid of digits actually
  // satisfies it — that retains the useful ones (CNP over 13 cells, phone over
  // 12) and drops exactly the impossible ones.
  if (r.patternId) {
    const probe = '0'.repeat(cells)
    const v = VALIDATION_BY_PATTERN[r.patternId]
    let satisfiable = false
    try {
      satisfiable = !!v && new RegExp(v.pattern).test(probe)
    } catch {
      satisfiable = false
    }
    if (!satisfiable) r.patternId = null
  }
  const tf = ctx.form.createTextField(r.name)
  tf.setText('')
  tf.setMaxLength(cells)
  tf.addToPage(page, { x: fx, y: topToPdfY(ctx.y, h), width: gridW, height: h, borderWidth: 0 })
  tf.setFontSize(size)
  tf.enableCombing()
  finalizeTextField(tf, spec, size)

  // Cell outlines: one box per character.
  const top = topToPdfY(ctx.y)
  const bottom = topToPdfY(ctx.y + h)
  for (let i = 0; i <= cells; i++) {
    const x = fx + i * w
    page.drawLine({ start: { x, y: top }, end: { x, y: bottom }, thickness: 0.5, color: SLOT })
  }
  page.drawLine({ start: { x: fx, y: top }, end: { x: fx + gridW, y: top }, thickness: 0.5, color: SLOT })
  page.drawLine({ start: { x: fx, y: bottom }, end: { x: fx + gridW, y: bottom }, thickness: 0.5, color: SLOT })

  ctx._register({ ...spec, maxLength: cells }, r)
  ctx.y += h + 14
}

function labeledField(ctx, spec, { labelW } = {}) {
  const { font } = ctx
  const size = 11
  const h = 16
  ctx.ensureSpace(h + 12)
  const page = ctx.page
  const label = spec.label + ':'
  const lw = labelW ?? font.widthOfTextAtSize(label, size) + 8
  page.drawText(label, { x: ctx.left, y: topToPdfY(ctx.y, size) - 2, size, font, color: INK })

  const r = ctx._resolve(spec)
  const fx = ctx.left + lw
  const fw = ctx.right - fx
  const tf = ctx.form.createTextField(r.name)
  tf.setText('')
  if (r.maxLength) tf.setMaxLength(r.maxLength)
  tf.addToPage(page, { x: fx, y: topToPdfY(ctx.y, h), width: fw, height: h, borderWidth: 0 })
  tf.setFontSize(11)
  finalizeTextField(tf, spec, 11)
  page.drawLine({
    start: { x: fx, y: topToPdfY(ctx.y + h) },
    end: { x: ctx.right, y: topToPdfY(ctx.y + h) },
    thickness: 0.5, color: SLOT,
  })
  ctx._register(spec, r)
  ctx.y += h + 12
}

/**
 * Two labeled fields sharing one row (e.g. Localitate | Județ).
 *
 * A label wider than its half of the row would be drawn straight through the
 * next column's label and leave no room to type — the national models carry
 * labels like „Venituri totale realizate în luna anterioară depunerii cererii
 * (lei)" that do not fit in half a page. When either label leaves less than
 * MIN_FIELD_W for its input, the pair falls back to two full-width rows, which
 * costs vertical space and keeps both readable.
 */
const MIN_FIELD_W = 70

function twoColFields(ctx, leftSpec, rightSpec) {
  const { font } = ctx
  const size = 11
  const h = 16
  const colGap = 24
  const colW = (ctx.contentW - colGap) / 2

  const fits = (spec) =>
    colW - (font.widthOfTextAtSize(spec.label + ':', size) + 8) >= MIN_FIELD_W
  if (!fits(leftSpec) || !fits(rightSpec)) {
    labeledField(ctx, leftSpec)
    labeledField(ctx, rightSpec)
    return
  }

  ctx.ensureSpace(h + 12)
  const page = ctx.page

  const draw = (spec, x0) => {
    const label = spec.label + ':'
    const lw = font.widthOfTextAtSize(label, size) + 8
    page.drawText(label, { x: x0, y: topToPdfY(ctx.y, size) - 2, size, font, color: INK })
    const r = ctx._resolve(spec)
    const fx = x0 + lw
    const fw = x0 + colW - fx
    const tf = ctx.form.createTextField(r.name)
    tf.setText('')
    if (r.maxLength) tf.setMaxLength(r.maxLength)
    tf.addToPage(page, { x: fx, y: topToPdfY(ctx.y, h), width: fw, height: h, borderWidth: 0 })
    tf.setFontSize(11)
    finalizeTextField(tf, spec, 11)
    page.drawLine({
      start: { x: fx, y: topToPdfY(ctx.y + h) },
      end: { x: x0 + colW, y: topToPdfY(ctx.y + h) },
      thickness: 0.5, color: SLOT,
    })
    ctx._register(spec, r)
  }

  draw(leftSpec, ctx.left)
  draw(rightSpec, ctx.left + colW + colGap)
  ctx.y += h + 12
}

/** A multiline text box (label above, framed area below). */
function multilineField(ctx, spec, { lines = 5 } = {}) {
  const { font } = ctx
  const size = 11
  const h = lines * 18
  ctx.ensureSpace(size * 1.6 + h + 14)
  const page = ctx.page
  if (spec.label) {
    page.drawText(spec.label, { x: ctx.left, y: topToPdfY(ctx.y, size), size, font, color: INK })
    ctx.y += size * 1.6
  }
  const r = ctx._resolve({ ...spec, multiline: true })
  const tf = ctx.form.createTextField(r.name)
  tf.setText('')
  tf.enableMultiline()
  tf.addToPage(page, { x: ctx.left, y: topToPdfY(ctx.y, h), width: ctx.contentW, height: h, borderWidth: 0 })
  tf.setFontSize(11)
  finalizeTextField(tf, spec, 11)
  page.drawRectangle({
    x: ctx.left, y: topToPdfY(ctx.y, h), width: ctx.contentW, height: h,
    borderWidth: 0.5, borderColor: SLOT,
  })
  ctx._register({ ...spec, multiline: true }, r)
  ctx.y += h + 14
}

/** Footer: "Data" (left) + "Semnătura" (right), each with a field. */
function signatureFooter(ctx, { dateLabel = 'Data', signatureLabel = 'Semnătura' } = {}) {
  const { font } = ctx
  ctx.y += 16
  const size = 11
  const h = 16
  const colW = (ctx.contentW - 40) / 2
  // Keep the date + signature row together on one page.
  ctx.ensureSpace(h + 12)
  const page = ctx.page

  // Data (left)
  const dl = dateLabel + ':'
  page.drawText(dl, { x: ctx.left, y: topToPdfY(ctx.y, size) - 2, size, font, color: INK })
  const dlw = font.widthOfTextAtSize(dl, size) + 8
  const dSpec = { label: dateLabel, name: 'data' }
  const dr = ctx._resolve(dSpec)
  const dtf = ctx.form.createTextField(dr.name)
  dtf.setText('')
  dtf.addToPage(page, { x: ctx.left + dlw, y: topToPdfY(ctx.y, h), width: colW - dlw, height: h, borderWidth: 0 })
  dtf.setFontSize(11)
  finalizeTextField(dtf, dSpec, 11)
  page.drawLine({
    start: { x: ctx.left + dlw, y: topToPdfY(ctx.y + h) },
    end: { x: ctx.left + colW, y: topToPdfY(ctx.y + h) }, thickness: 0.5, color: SLOT,
  })
  ctx._register(dSpec, dr)

  // Semnătura (right) — kept a plain text field so the app's signature overlay
  // (isSignatureField matches /semn[aă]tur/) can take it over.
  const sx = ctx.left + colW + 40
  const sl = signatureLabel + ':'
  page.drawText(sl, { x: sx, y: topToPdfY(ctx.y, size) - 2, size, font, color: INK })
  const slw = font.widthOfTextAtSize(sl, size) + 8
  const sSpec = { label: signatureLabel, name: 'semnatura' }
  const sr = ctx._resolve(sSpec)
  const stf = ctx.form.createTextField(sr.name)
  stf.setText('')
  stf.addToPage(page, { x: sx + slw, y: topToPdfY(ctx.y, h), width: ctx.right - (sx + slw), height: h, borderWidth: 0 })
  stf.setFontSize(11)
  finalizeTextField(stf, sSpec, 11)
  page.drawLine({
    start: { x: sx + slw, y: topToPdfY(ctx.y + h) },
    end: { x: ctx.right, y: topToPdfY(ctx.y + h) }, thickness: 0.5, color: SLOT,
  })
  ctx._register(sSpec, sr)
  ctx.y += h + 12
}

/**
 * A checkbox with its label wrapped to the right of the box — used for
 * declarations / consents ("Declar pe propria răspundere că …"). Registers a
 * `checkbox` field; mark `required: true` for must-acknowledge consents.
 */
function checkbox(ctx, spec) {
  const { font } = ctx
  const size = 10.5
  const box = 11
  const lh = size * 1.35
  // `indent` (points) nests sub-options under a parent checkbox — used by the
  // national DSP models' unit-type → urban/rural hierarchy.
  const x0 = ctx.left + (spec.indent ?? 0)
  const textX = x0 + box + 8
  const textW = ctx.right - textX
  const lines = wrap(font, spec.label, size, textW)
  ctx.ensureSpace(Math.max(box, lines.length * lh) + 8)
  const page = ctx.page

  const r = ctx._resolve({ ...spec, type: 'checkbox' })
  const cb = ctx.form.createCheckBox(r.name)
  cb.addToPage(page, {
    x: x0, y: topToPdfY(ctx.y, box), width: box, height: box,
    borderWidth: 0.8, borderColor: RULE,
  })
  // Checkboxes keep pdf-lib's ZapfDingbats appearance; only the flag matters.
  if (spec.required) cb.enableRequired()
  let ty = ctx.y
  for (const line of lines) {
    page.drawText(line, { x: textX, y: topToPdfY(ty, size), size, font, color: INK })
    ty += lh
  }
  // checkbox fields carry no maxLength/placeholder — register the bare spec.
  ctx.templateFields.push({
    pdfFieldName: r.name,
    type: 'checkbox',
    label: spec.label,
    ...(spec.group ? { group: spec.group } : {}),
    order: ctx._order++,
    isRequired: Boolean(spec.required),
    maxLength: null,
  })
  ctx.y = Math.max(ty, ctx.y + box) + 8
}

/**
 * Repeating-row table — the `tabel nominal` layout shape: a bordered grid
 * with a header row, a static auto-numbered "Nr. crt." column, and one text
 * field per body cell. Field names are `${name}_r${row}_${col.key}`;
 * labels become `${col.header} (rândul N)` in the Template JSON.
 *
 * @param {object} cfg
 * @param {string} cfg.name              field-name prefix (e.g. 'persoana')
 * @param {Array}  cfg.columns           [{header, key, width?, maxLength?}]
 *                                       width in points; unsized columns share
 *                                       the remaining width equally
 * @param {number} [cfg.rows=8]
 * @param {string} [cfg.group]
 */
function table(ctx, { name, columns, rows = 8, group }) {
  const { font } = ctx
  const headerSize = 8.5
  const cellSize = 9
  const rowH = 20
  const pad = 3

  // Nr. crt. is ours (static numbering), prepended to the caller's columns.
  const NR = { header: 'Nr. crt.', key: '__nr', width: 34 }
  const cols = [NR, ...columns]
  const fixed = cols.reduce((s, c) => s + (c.width ?? 0), 0)
  const flexCount = cols.filter((c) => !c.width).length
  const flexW = (ctx.contentW - fixed) / Math.max(flexCount, 1)
  const widths = cols.map((c) => c.width ?? flexW)

  const headerLines = cols.map((c) => wrap(font, c.header, headerSize, widths[cols.indexOf(c)] - 2 * pad))
  const headerH = Math.max(...headerLines.map((l) => l.length)) * headerSize * 1.3 + 2 * pad

  const drawHeaderRow = () => {
    const page = ctx.page
    let x = ctx.left
    for (let c = 0; c < cols.length; c++) {
      page.drawRectangle({
        x, y: topToPdfY(ctx.y, headerH), width: widths[c], height: headerH,
        borderWidth: 0.7, borderColor: RULE,
      })
      let ty = ctx.y + pad
      for (const line of headerLines[c]) {
        page.drawText(line, { x: x + pad, y: topToPdfY(ty, headerSize), size: headerSize, font, color: INK })
        ty += headerSize * 1.3
      }
      x += widths[c]
    }
    ctx.y += headerH
  }

  ctx.ensureSpace(headerH + rowH)
  drawHeaderRow()

  for (let r = 1; r <= rows; r++) {
    const pageBefore = ctx.page
    ctx.ensureSpace(rowH)
    if (ctx.page !== pageBefore) drawHeaderRow()
    const page = ctx.page
    let x = ctx.left
    for (let c = 0; c < cols.length; c++) {
      page.drawRectangle({
        x, y: topToPdfY(ctx.y, rowH), width: widths[c], height: rowH,
        borderWidth: 0.7, borderColor: RULE,
      })
      const col = cols[c]
      if (col.key === '__nr') {
        // Static row number — not a field.
        page.drawText(String(r), {
          x: x + pad, y: topToPdfY(ctx.y + (rowH - cellSize) / 2, cellSize), size: cellSize, font, color: INK,
        })
      } else {
        const spec = {
          label: `${col.header} (rândul ${r})`,
          name: `${name}_r${r}_${col.key}`,
          ...(col.maxLength ? { maxLength: col.maxLength } : {}),
          ...(group ? { group } : {}),
        }
        const res = ctx._resolve(spec)
        const tf = ctx.form.createTextField(res.name)
        tf.setText('')
        if (res.maxLength) tf.setMaxLength(res.maxLength)
        tf.addToPage(page, {
          x: x + 1, y: topToPdfY(ctx.y, rowH) + 1, width: widths[c] - 2, height: rowH - 2, borderWidth: 0,
        })
        tf.setFontSize(cellSize)
        finalizeTextField(tf, spec, cellSize)
        ctx._register(spec, res)
      }
      x += widths[c]
    }
    ctx.y += rowH
  }
  ctx.y += 14
}

/** Greedy word wrap using the embedded font's real glyph metrics. */
function wrap(font, text, size, maxW) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const probe = line ? line + ' ' + w : w
    if (font.widthOfTextAtSize(probe, size) > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = probe
    }
  }
  if (line) lines.push(line)
  return lines
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Build an archetype into PDF bytes + a Template JSON object.
 * @param {ArchetypeSpec} spec
 * @param {Instance} [instance]
 * @returns {Promise<{ pdfBytes: Uint8Array, template: object }>}
 */
export async function buildArchetype(spec, instance = {}) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(readFileSync(FONT_PATH))
  const page = doc.addPage([PAGE_W, PAGE_H])
  const form = doc.getForm()

  // Make the embedded NotoSans reachable from field /DA strings (see
  // registerAcroFormFont) BEFORE any field is created.
  registerAcroFormFont(doc, form, font)

  const ctx = new AuthorCtx(doc, page, form, font)
  await drawHeader(ctx, instance, spec.title)
  // `addressee` is curried with the instance so specs can drop the required
  // institution slot into the body's first rows without re-threading it.
  const primitives = {
    paragraph,
    labeledField,
    combField,
    twoColFields,
    multilineField,
    checkbox,
    table,
    signatureFooter,
    addressee: (c, opts) => addressee(c, instance, opts),
  }
  spec.body(ctx, primitives, instance)

  // Regenerate blank appearance streams with NotoSans so the empty fields'
  // /AP matches their /DA font instead of pdf-lib's Helvetica default.
  form.updateFieldAppearances(font)

  // Classic xref table (no object streams): pdf-lib's object-stream output
  // trips strict parsers (MuPDF warns `cannot find object in xref`), and some
  // institution-side viewers are old. Costs a few KB, buys compatibility.
  const pdfBytes = await doc.save({ useObjectStreams: false })

  const idSuffix = instance.institutionName
    ? '-' + toFieldName(instance.institutionName)
    : ''
  const template = {
    id: spec.id + idSuffix,
    name: instance.institutionName ? `${spec.name} — ${instance.institutionName}` : spec.name,
    ...(spec.description ? { description: spec.description } : {}),
    ...(spec.category ? { category: spec.category } : {}),
    // A spec that replicates one institution's own form carries that
    // institution itself (`spec.organization` + `spec.county`), so the catalog
    // files it under that organisation without a stamped per-instance build.
    // An explicit `--institution` still wins: that is the stamping path.
    ...(instance.institutionName || spec.organization
      ? { organization: instance.institutionName || spec.organization }
      : {}),
    ...(spec.county ? { county: spec.county } : {}),
    version: 1,
    createdAt: new Date().toISOString(),
    fields: ctx.templateFields,
    // driveFileId is assigned at publish time (admin upload). The acroFormOrigin
    // is 'generated' because we authored it — but unlike detector output, these
    // labels are hand-curated and trustworthy.
    driveFileId: '',
    acroFormOrigin: 'generated',
    // Marks this as an authored archetype (not a scraped form) for tooling.
    archetype: spec.id,
  }

  return { pdfBytes, template }
}

export { toFieldName }
