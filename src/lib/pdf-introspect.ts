import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
} from 'pdf-lib'
import type { TemplateField, FieldType } from '@/types/template'

export async function introspectPdf(arrayBuffer: ArrayBuffer): Promise<TemplateField[]> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const form = pdfDoc.getForm()

  const hasXfa = form.hasXFA()
  console.group('[pdf-introspect] PDF loaded')
  console.log('Pages:', pdfDoc.getPageCount())
  console.log('XFA form (non-AcroForm, may not work):', hasXfa)

  // getFields() calls convertToPDFField() internally which returns undefined for
  // unrecognised internal types (PDFButton, PDFSignature, etc.).
  // Filter those out before doing anything else.
  const rawFields = form.getFields()
  const fields = rawFields.filter(Boolean)
  console.log(`Raw fields from getFields(): ${rawFields.length}, after filter(Boolean): ${fields.length}`)

  const result: TemplateField[] = []
  let order = 0

  for (const field of fields) {
    const pdfFieldName = field.getName()

    let type: FieldType = 'unsupported'
    let isMultiline = false
    let maxLength: number | null = null
    let options: string[] | undefined

    if (field instanceof PDFTextField) {
      type = 'text'
      isMultiline = field.isMultiline()
      maxLength = field.getMaxLength() ?? null
    } else if (field instanceof PDFCheckBox) {
      type = 'checkbox'
    } else if (field instanceof PDFDropdown) {
      // Combo box — single-select with optional free text
      type = 'dropdown'
      options = field.getOptions()
    } else if (field instanceof PDFOptionList) {
      // List box — single or multi-select; treat as dropdown in the form UI
      type = 'dropdown'
      options = field.getOptions()
    } else if (field instanceof PDFRadioGroup) {
      type = 'radio'
      options = field.getOptions()
    }
    // PDFButton and PDFSignature fall through → type remains 'unsupported'

    let isReadOnly = false
    try {
      isReadOnly = field.isReadOnly()
    } catch {
      // Some internal field types don't implement isReadOnly — treat as read-only
      isReadOnly = true
    }

    let isRequired = false
    try {
      isRequired = field.isRequired()
    } catch {
      isRequired = false
    }

    const hidden = type === 'unsupported' || isReadOnly

    console.log(
      `  [${String(order).padStart(2, '0')}] "${pdfFieldName}"`,
      `| type: ${type}`,
      ...(type === 'text' ? [`| multiline: ${isMultiline}`, `| maxLength: ${maxLength ?? '—'}`] : []),
      ...(options ? [`| options: [${options.join(', ')}]`] : []),
      `| required: ${isRequired}`,
      `| readOnly: ${isReadOnly}`,
      hidden ? '→ HIDDEN' : '→ visible',
    )

    result.push({
      pdfFieldName,
      type,
      label: prettifyFieldName(pdfFieldName),
      hint: '',
      group: '',
      order: order++,
      isRequired,
      isMultiline: isMultiline || undefined,
      maxLength: maxLength ?? undefined,
      options,
      // Auto-hide unsupported types and read-only fields.
      // Admin can un-hide read-only fields manually if they want them pre-filled.
      hidden,
    })
  }

  const visible = result.filter((f) => !f.hidden)
  const hidden = result.filter((f) => f.hidden)
  console.log(`Summary: ${visible.length} visible, ${hidden.length} hidden (${hidden.map((f) => `"${f.pdfFieldName}"`).join(', ') || 'none'})`)
  console.groupEnd()

  return result
}

function prettifyFieldName(name: string): string {
  // "section1.first_name" → "First Name"
  const last = name.split('.').pop() ?? name
  return last
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
