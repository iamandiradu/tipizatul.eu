import { PDFDocument } from 'pdf-lib'
import type { Template, FormValues } from '@/types/template'
import { getNotoSansBytes } from '@/lib/drive'

export async function fillAndDownload(
  template: Template,
  pdfBytes: ArrayBuffer,
  values: FormValues,
  fileName?: string,
): Promise<void> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const form = pdfDoc.getForm()

  // Embed NotoSans for full Romanian diacritics support:
  // ă â î — covered by Latin-1 fonts, but ș ț (comma-below) require a Unicode font.
  const fontBytes = await getNotoSansBytes()
  const font = await pdfDoc.embedFont(fontBytes)

  const visibleFields = template.fields.filter((f) => !f.hidden)

  for (const fieldDef of visibleFields) {
    const rawValue = values[fieldDef.pdfFieldName]
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    try {
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

  const filledBytes = await pdfDoc.save()
  triggerDownload(filledBytes, fileName ?? `${template.name}.pdf`)
}

function triggerDownload(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
