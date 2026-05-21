import { PDFDocument, PDFDict, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Template, FormValues } from '@/types/template'
import { getNotoSansBytes } from '@/lib/drive'
import { isSignatureField, isSignatureValue, decodeSignatureValue } from '@/lib/signature'

// How tall a rendered signature can be relative to its widget's bbox.
// Romanian signature slots are typically a 10–14 pt underline, far too
// small to host a readable signature aspect-fit-style. Allowing the image
// to grow vertically above the widget — anchored at the widget's bottom
// edge so it climbs into the whitespace where a paper signature would
// have gone — is the cheap fix. Bump this up if signatures still look
// cramped on a particular form; drop it if a tall image collides with
// text above the slot.
const SIGNATURE_MAX_HEIGHT_MULTIPLIER = 3

export async function fillPdf(
  template: Template,
  pdfBytes: ArrayBuffer,
  values: FormValues,
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

  for (const fieldDef of visibleFields) {
    const rawValue = values[fieldDef.pdfFieldName]
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    try {
      // Signature route — handled before the type switch so it works
      // regardless of the underlying widget type (we treat any text-shaped
      // widget that carries a `Semnătura`-style label as a sig slot).
      if (isSignatureField(fieldDef) && isSignatureValue(rawValue)) {
        await drawSignatureOnto(pdfDoc, form, fieldDef.pdfFieldName, rawValue, pageByWidgetDict)
        continue
      }

      switch (fieldDef.type) {
        case 'text': {
          form.getTextField(fieldDef.pdfFieldName).setText(String(rawValue))
          break
        }
        case 'checkbox': {
          const cb = form.getCheckBox(fieldDef.pdfFieldName)
          rawValue === true || rawValue === 'true' ? cb.check() : cb.uncheck()
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

  return pdfDoc.save()
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

// Draw the signature image at the field's widget rect(s) and then remove
// the form field. Removal matters: pdf-lib's `flatten()` bakes each widget's
// appearance stream into the page content AFTER any drawing we did, so a
// surviving (now-empty) text field would render an opaque white box on top
// of the signature. Removing the field strips both the field record and
// the page-level annotation, so flatten has nothing to overlay.
async function drawSignatureOnto(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  dataUrl: string,
  pageByWidgetDict: Map<PDFDict, PDFPage>,
): Promise<void> {
  const decoded = decodeSignatureValue(dataUrl)
  if (!decoded) {
    console.warn(`[pdf-fill] signature: could not decode data URL for "${fieldName}"`)
    return
  }
  const image =
    decoded.kind === 'png'
      ? await pdfDoc.embedPng(decoded.bytes)
      : await pdfDoc.embedJpg(decoded.bytes)

  let textField: ReturnType<typeof form.getTextField> | null = null
  try {
    textField = form.getTextField(fieldName)
  } catch (err) {
    console.warn(`[pdf-fill] signature: getTextField failed for "${fieldName}"`, err)
    return
  }
  const widgets = textField.acroField.getWidgets()
  if (widgets.length === 0) {
    console.warn(`[pdf-fill] signature: no widgets attached to "${fieldName}"`)
    return
  }

  for (const widget of widgets) {
    const rect = widget.getRectangle()
    const page = pageByWidgetDict.get(widget.dict) ?? pdfDoc.getPages()[0]
    if (!page) continue

    // Width is bounded by the widget; height is bounded by N× the widget
    // height (signature climbs above the slot, see the constant's comment).
    // Aspect ratio preserved by picking the tighter of the two scale factors.
    const widthScale = rect.width / image.width
    const heightCap = rect.height * SIGNATURE_MAX_HEIGHT_MULTIPLIER
    const heightScale = heightCap / image.height
    const scale = Math.min(widthScale, heightScale)
    const drawW = image.width * scale
    const drawH = image.height * scale
    // Centre horizontally within the slot; anchor at the slot's bottom
    // edge so growth happens upward into the whitespace above.
    const x = rect.x + (rect.width - drawW) / 2
    const y = rect.y

    page.drawImage(image, { x, y, width: drawW, height: drawH })
  }

  // Strip the now-redundant text widget so flatten() doesn't overlay it.
  try {
    form.removeField(textField)
  } catch (err) {
    console.warn(`[pdf-fill] signature: removeField failed for "${fieldName}"`, err)
  }
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
