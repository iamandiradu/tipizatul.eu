import { PDFDocument, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { Template, FormValues } from '@/types/template'
import { getNotoSansBytes } from '@/lib/drive'
import { isSignatureField, isSignatureValue, decodeSignatureValue } from '@/lib/signature'

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
  // doesn't expose that directly. Build a one-time index from widget-ref →
  // page so per-field lookups stay O(1).
  const pageByWidgetRef = buildWidgetPageIndex(pdfDoc)

  for (const fieldDef of visibleFields) {
    const rawValue = values[fieldDef.pdfFieldName]
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    try {
      // Signature route — handled before the type switch so it works
      // regardless of the underlying widget type (we treat any text-shaped
      // widget that carries a `Semnătura`-style label as a sig slot).
      if (isSignatureField(fieldDef) && isSignatureValue(rawValue)) {
        await drawSignatureOnto(pdfDoc, form, fieldDef.pdfFieldName, rawValue, pageByWidgetRef)
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

// Walk every page's /Annots once and remember which page each widget ref
// lives on. The page → widget direction is the cheap one in pdf-lib; the
// reverse takes work. We rebuild this per fill (PDFs are small enough that
// this is cheap, and avoids stale state across reloads of the same doc).
function buildWidgetPageIndex(pdfDoc: PDFDocument): Map<string, PDFPage> {
  const map = new Map<string, PDFPage>()
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots()
    if (!annots) continue
    const arr = annots.asArray()
    for (const ref of arr) {
      map.set(ref.toString(), page)
    }
  }
  return map
}

// Draw the signature image on top of the named field's widget(s), clear
// the underlying text value so it doesn't render alongside the image after
// flatten(), and scale the image to fit within the widget rect preserving
// aspect ratio.
async function drawSignatureOnto(
  pdfDoc: PDFDocument,
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  dataUrl: string,
  pageByWidgetRef: Map<string, PDFPage>,
): Promise<void> {
  const decoded = decodeSignatureValue(dataUrl)
  if (!decoded) return
  const image =
    decoded.kind === 'png'
      ? await pdfDoc.embedPng(decoded.bytes)
      : await pdfDoc.embedJpg(decoded.bytes)

  let textField: ReturnType<typeof form.getTextField> | null = null
  try {
    textField = form.getTextField(fieldName)
  } catch {
    // Widget might not be a TextField (rare in our corpus). Skip rather
    // than throw — the image draw below still works off raw widgets if
    // the field is otherwise addressable.
  }
  const widgets = textField?.acroField.getWidgets() ?? []
  if (widgets.length === 0) return

  // Wipe the underlying text so flatten() doesn't render a stray "[object
  // Object]" / data-URL string under the image.
  try { textField?.setText('') } catch { /* non-fatal */ }

  for (const widget of widgets) {
    const rect = widget.getRectangle()
    const page = findPageForWidget(widget, pageByWidgetRef, pdfDoc)
    if (!page) continue

    // Aspect-fit. Tight slots stay readable; wide-but-short slots don't
    // distort the signature.
    const sx = rect.width / image.width
    const sy = rect.height / image.height
    const scale = Math.min(sx, sy)
    const drawW = image.width * scale
    const drawH = image.height * scale
    const x = rect.x + (rect.width - drawW) / 2
    const y = rect.y + (rect.height - drawH) / 2

    page.drawImage(image, { x, y, width: drawW, height: drawH })
  }
}

function findPageForWidget(
  widget: ReturnType<ReturnType<ReturnType<PDFDocument['getForm']>['getTextField']>['acroField']['getWidgets']>[number],
  pageByWidgetRef: Map<string, PDFPage>,
  pdfDoc: PDFDocument,
): PDFPage | null {
  const ref = widget.ref
  if (ref) {
    const hit = pageByWidgetRef.get(ref.toString())
    if (hit) return hit
  }
  // Last resort: scan pages for an /Annots entry that resolves to this
  // widget's dict. Slow path; only fires on PDFs with malformed/missing
  // page-back-references.
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.Annots()
    if (!annots) continue
    for (const a of annots.asArray()) {
      if (a === ref) return page
    }
  }
  return null
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
