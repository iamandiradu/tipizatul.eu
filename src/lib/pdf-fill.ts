import {
  PDFDocument,
  PDFDict,
  PDFName,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Template, FormValues } from '@/types/template'
import { getNotoSansBytes } from '@/lib/drive'
import { isSignatureField, isSignatureValue, decodeSignatureValue } from '@/lib/signature'

// Default cap on rendered signature height relative to its widget's bbox.
// Romanian signature slots are typically a 10–14 pt underline; allowing
// the image to grow vertically above the widget gives the signature room
// to be readable. Per-signature overrides ride along on the value's
// `#h=N` fragment (see encodeSignatureValue / decodeSignatureValue);
// this constant is the fallback when none is supplied.
const SIGNATURE_DEFAULT_HEIGHT_MULTIPLIER = 3

export interface FillPdfOptions {
  // When true, skip the signature drawing pass entirely (and don't remove
  // the underlying text widgets). The live preview uses this so the
  // baked-in signature doesn't fight a draggable overlay rendered above
  // the PDF canvas. The final download leaves this unset, so signatures
  // are baked into the saved bytes.
  skipSignatures?: boolean
}

export async function fillPdf(
  template: Template,
  pdfBytes: ArrayBuffer,
  values: FormValues,
  opts: FillPdfOptions = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdfDoc.registerFontkit(fontkit)
  const form = pdfDoc.getForm()

  // Embed NotoSans for full Romanian diacritics support:
  // ă â î — covered by Latin-1 fonts, but ș ț (comma-below) require a Unicode font.
  const fontBytes = await getNotoSansBytes()
  const font = await pdfDoc.embedFont(fontBytes)

  const visibleFields = template.fields.filter((f) => !f.hidden)

  // Signature drawings need the page that owns the widget, and PDFAcroField
  // doesn't expose that directly. Build a one-time index from annotation
  // dict → page so per-field lookups stay O(1). Keyed by PDFDict identity
  // because pdf-lib caches lookups (same ref → same dict instance).
  const pageByWidgetDict = buildWidgetPageIndex(pdfDoc)

  // Signatures need to render ON TOP of every other field, so we defer the
  // drawImage step until after flatten(). During the field pass we just
  // embed the image, resolve its target page + rect, and remove the
  // underlying text widget (so flatten doesn't paint a blank box on top).
  const signatureDraws: SignatureDraw[] = []

  for (const fieldDef of visibleFields) {
    const rawValue = values[fieldDef.pdfFieldName]
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    try {
      // Signature route — handled before the type switch so it works
      // regardless of the underlying widget type (we treat any text-shaped
      // widget that carries a `Semnătura`-style label as a sig slot).
      // skipSignatures = preview mode; let the drag overlay show the image
      // instead of baking it into the PDF (otherwise the overlay sits over
      // a duplicate that doesn't move with it).
      if (isSignatureField(fieldDef) && isSignatureValue(rawValue)) {
        if (opts.skipSignatures) continue
        const prepared = await prepareSignature(
          pdfDoc, form, fieldDef.pdfFieldName, rawValue, pageByWidgetDict,
        )
        signatureDraws.push(...prepared)
        continue
      }

      switch (fieldDef.type) {
        case 'text': {
          form.getTextField(fieldDef.pdfFieldName).setText(String(rawValue))
          break
        }
        case 'checkbox': {
          const cb = form.getCheckBox(fieldDef.pdfFieldName)
          if (rawValue === true || rawValue === 'true') cb.check()
          else cb.uncheck()
          break
        }
        case 'dropdown': {
          try {
            form.getDropdown(fieldDef.pdfFieldName).select(String(rawValue))
          } catch {
            form.getOptionList(fieldDef.pdfFieldName).select(String(rawValue))
          }
          break
        }
        case 'radio': {
          form.getRadioGroup(fieldDef.pdfFieldName).select(String(rawValue))
          break
        }
      }
    } catch (err) {
      console.warn(`[pdf-fill] Could not fill field "${fieldDef.pdfFieldName}":`, err)
    }
  }

  form.updateFieldAppearances(font)
  form.flatten()

  // flatten() deletes the widget/field objects but leaves their refs in each
  // page's /Annots array. The dangling refs are cosmetic for lenient viewers
  // but trip strict parsers (MuPDF: "cannot find object in xref"), and some
  // institution-side tooling is strict. Keep only refs that still resolve —
  // non-widget annotations (e.g. link annots in scraped PDFs) survive intact.
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots()
    if (!annots) continue
    const live = annots
      .asArray()
      .filter((ref) => pdfDoc.context.lookup(ref) !== undefined)
    if (live.length === 0) page.node.delete(PDFName.of('Annots'))
    else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(live))
  }

  // Signatures land last so they sit on top of every flattened widget. This
  // matters when a signature image overflows upward into the bbox of an
  // adjacent filled text field — without this ordering, that field's
  // flattened appearance would paint over our image.
  for (const draw of signatureDraws) {
    draw.page.drawImage(draw.image, {
      x: draw.x,
      y: draw.y,
      width: draw.width,
      height: draw.height,
    })
  }

  return pdfDoc.save()
}

interface SignatureDraw {
  page: PDFPage
  image: PDFImage
  x: number
  y: number
  width: number
  height: number
}

// Walk every page's /Annots once and remember which page each annotation
// dict belongs to. The page → widget direction is the cheap one in
// pdf-lib; the reverse takes work. We rebuild this per fill (PDFs are
// small enough that it's cheap, and it avoids stale state across reloads
// of the same doc). Keyed by PDFDict because pdf-lib caches lookups —
// the same ref always resolves to the same dict instance, so
// `pageByWidgetDict.get(widget.dict)` is a valid identity probe.
function buildWidgetPageIndex(pdfDoc: PDFDocument): Map<PDFDict, PDFPage> {
  const map = new Map<PDFDict, PDFPage>()
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots()
    if (!annots) continue
    for (const ref of annots.asArray()) {
      const dict = pdfDoc.context.lookup(ref, PDFDict)
      if (dict) map.set(dict, page)
    }
  }
  return map
}

// Resolve everything we need to render a signature later (image, page,
// position + dimensions) and remove the underlying text widget so flatten()
// doesn't paint a blank rectangle where the signature is about to land.
// The actual drawImage call happens AFTER flatten() — see fillPdf — so the
// signature sits on top of every other field's appearance.
async function prepareSignature(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  dataUrl: string,
  pageByWidgetDict: Map<PDFDict, PDFPage>,
): Promise<SignatureDraw[]> {
  const decoded = decodeSignatureValue(dataUrl)
  if (!decoded) {
    console.warn(`[pdf-fill] signature: could not decode data URL for "${fieldName}"`)
    return []
  }
  const image =
    decoded.kind === 'png'
      ? await pdfDoc.embedPng(decoded.bytes)
      : await pdfDoc.embedJpg(decoded.bytes)
  const heightMultiplier = decoded.heightMultiplier ?? SIGNATURE_DEFAULT_HEIGHT_MULTIPLIER

  let textField: ReturnType<typeof form.getTextField> | null = null
  try {
    textField = form.getTextField(fieldName)
  } catch (err) {
    console.warn(`[pdf-fill] signature: getTextField failed for "${fieldName}"`, err)
    // No widget to anchor to — only an explicit placement override can save
    // this case. Fall through with widgets=[] so the override branch below
    // still gets a chance.
  }
  const widgets = textField?.acroField.getWidgets() ?? []

  // Explicit placement (user dragged the signature on the preview) takes
  // precedence over the widget rect. Bypasses the widget bbox entirely so
  // the signature lands exactly where the user dropped it.
  if (decoded.placement) {
    const p = decoded.placement
    const page = pdfDoc.getPages()[p.pageIndex]
    if (!page) {
      console.warn(`[pdf-fill] signature: placement pageIndex ${p.pageIndex} out of range`)
    } else {
      // Removal still happens so the underlying empty text field doesn't
      // remain after flatten() — but only if we actually have a field.
      if (textField) {
        try { form.removeField(textField) }
        catch (err) { console.warn(`[pdf-fill] signature: removeField failed for "${fieldName}"`, err) }
      }
      return [{ page, image, x: p.x, y: p.y, width: p.width, height: p.height }]
    }
  }

  if (!textField || widgets.length === 0) {
    console.warn(`[pdf-fill] signature: no widgets attached to "${fieldName}"`)
    return []
  }

  const draws: SignatureDraw[] = []
  for (const widget of widgets) {
    const rect = widget.getRectangle()
    const page = pageByWidgetDict.get(widget.dict) ?? pdfDoc.getPages()[0]
    if (!page) continue

    // Width is bounded by the widget; height is bounded by N× the widget
    // height (signature climbs above the slot, see the constant's comment).
    // Aspect ratio preserved by picking the tighter of the two scale factors.
    const widthScale = rect.width / image.width
    const heightCap = rect.height * heightMultiplier
    const heightScale = heightCap / image.height
    const scale = Math.min(widthScale, heightScale)
    const drawW = image.width * scale
    const drawH = image.height * scale
    // Centre horizontally within the slot; anchor at the slot's bottom
    // edge so growth happens upward into the whitespace above.
    const x = rect.x + (rect.width - drawW) / 2
    const y = rect.y

    draws.push({ page, image, x, y, width: drawW, height: drawH })
  }

  // Strip the now-redundant text widget so flatten() doesn't paint a blank
  // appearance where the signature will land.
  try {
    form.removeField(textField)
  } catch (err) {
    console.warn(`[pdf-fill] signature: removeField failed for "${fieldName}"`, err)
  }

  return draws
}


export async function fillAndDownload(
  template: Template,
  pdfBytes: ArrayBuffer,
  values: FormValues,
  fileName?: string,
): Promise<void> {
  const filledBytes = await fillPdf(template, pdfBytes, values)
  triggerPdfDownload(filledBytes, fileName ?? `${template.name}.pdf`)
}

export function triggerPdfDownload(
  bytes: Uint8Array | ArrayBuffer,
  fileName: string,
): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
