import * as pdfjsLib from 'pdfjs-dist'

export interface WidgetRect {
  pageIndex: number
  pdfFieldName: string
  // PDF user-space (origin bottom-left), same coordinate system pdf-lib
  // uses — these can be handed straight back into fillPdf without
  // conversion.
  x: number
  y: number
  width: number
  height: number
}

// Reads the AcroForm widget rectangles off a PDF without touching the
// canvas pipeline. Lives apart from PdfPreview because the consumer
// (the signature overlay) needs the original-document rects to survive
// across previews — fillPdf's flatten() strips the widgets, so a per-
// render harvest from the live preview bytes would lose them.
export async function harvestWidgetRects(
  bytes: ArrayBuffer | Uint8Array,
): Promise<WidgetRect[]> {
  // Clone — pdfjs may transfer ownership of the buffer to its worker.
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const copy = new Uint8Array(view.length)
  copy.set(view)

  const task = pdfjsLib.getDocument({ data: copy })
  try {
    const pdf = await task.promise
    const rects: WidgetRect[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      try {
        const annots = await page.getAnnotations()
        for (const a of annots) {
          if (a.subtype !== 'Widget') continue
          if (!a.fieldName || !a.rect) continue
          const [x1, y1, x2, y2] = a.rect as [number, number, number, number]
          rects.push({
            pageIndex: i - 1,
            pdfFieldName: a.fieldName,
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
          })
        }
      } finally {
        page.cleanup()
      }
    }
    pdf.destroy()
    return rects
  } finally {
    task.destroy()
  }
}
