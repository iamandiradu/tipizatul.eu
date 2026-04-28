/**
 * Overlays AcroForm fields onto a PDF using pdf-lib.
 * Fields are transparent — they sit on top of existing form graphics.
 */

import { PDFDocument } from 'pdf-lib'

/**
 * Add AcroForm fields to a PDF.
 * @param {Buffer|Uint8Array} pdfBytes - Original PDF bytes (not modified)
 * @param {Array} fields - Labeled/detected fields from label-associator
 * @returns {Promise<Uint8Array>} - New PDF bytes with AcroForm fields
 */
export async function addAcroFormFields(pdfBytes, fields) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const form = doc.getForm()
  const pages = doc.getPages()

  for (const field of fields) {
    const page = pages[field.page]
    if (!page) continue

    try {
      switch (field.type) {
        case 'text': {
          const tf = form.createTextField(field.pdfFieldName)
          tf.addToPage(page, {
            x: field.x,
            y: field.y,
            width: Math.max(field.width, 20),
            height: Math.max(field.height, 12),
            borderWidth: 0,
          })
          if (field.maxLength) tf.setMaxLength(field.maxLength)
          if (field.isMultiline) tf.enableMultiline()
          const fs = Math.min(field.fontSize || 10, 14)
          tf.setFontSize(fs > 0 ? fs : 10)
          break
        }
        case 'checkbox': {
          const cb = form.createCheckBox(field.pdfFieldName)
          cb.addToPage(page, {
            x: field.x,
            y: field.y,
            width: Math.max(field.width, 8),
            height: Math.max(field.height, 8),
            borderWidth: 0,
          })
          break
        }
        // Radio buttons and other types could be added here
        default:
          break
      }
    } catch (err) {
      // Skip fields that fail (e.g., duplicate names after dedup edge cases)
      console.warn(`  Warning: could not create field "${field.pdfFieldName}": ${err.message}`)
    }
  }

  return doc.save()
}
