import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TemplateField } from '@/types/template'
import type { PdfPageInfo } from './PdfPreview'
import {
  decodeSignatureValue,
  encodeSignatureValue,
  isSignatureField,
  isSignatureValue,
  type SignaturePlacement,
} from '@/lib/signature'

// Default height multiplier when a freshly-signed value carries no `#h=N`.
// Keep in sync with SIGNATURE_DEFAULT_HEIGHT_MULTIPLIER in pdf-fill.ts so
// the overlay shows the same size pdf-fill would render.
const DEFAULT_HEIGHT_MULTIPLIER = 3

interface SignatureOverlayProps {
  pages: PdfPageInfo[]
  fields: TemplateField[]
  values: Record<string, unknown>
  onPlacementChange: (pdfFieldName: string, next: string) => void
}

// Renders one draggable <img> per signed field, portal-mounted into the
// matching PdfPreview page wrapper. Position is derived from either the
// stored placement override or, if none yet, the matching widget's rect.
// On pointer-up the new position is encoded back into the form value so
// the final fillPdf draws there.
export default function SignatureOverlay({
  pages,
  fields,
  values,
  onPlacementChange,
}: SignatureOverlayProps) {
  const sigFieldNames = new Set(
    fields.filter(isSignatureField).map((f) => f.pdfFieldName),
  )
  // Diagnostic — one-off log per render. The overlay silently returns null
  // in several branches; this surfaces why so a missing-signature report
  // ("I don't see anything") can be triaged from the browser console.
  if (typeof window !== 'undefined') {
    console.debug('[SignatureOverlay] render', {
      pageCount: pages.length,
      signatureFieldCount: sigFieldNames.size,
      signatureFieldNames: [...sigFieldNames],
      signedValuePresent: [...sigFieldNames].filter((n) => isSignatureValue(values[n])),
      widgetsByPage: pages.map((p) => ({
        page: p.pageIndex,
        widgets: p.widgets.map((w) => w.pdfFieldName),
      })),
    })
  }
  if (sigFieldNames.size === 0 || pages.length === 0) return null

  // Build the placements + page bindings once per render. Keys missing
  // either a known widget rect or a valid signature value are skipped.
  const items: OverlayItem[] = []
  for (const fieldName of sigFieldNames) {
    const value = values[fieldName]
    if (!isSignatureValue(value)) continue
    const decoded = decodeSignatureValue(value)
    if (!decoded) continue

    // Find the widget rect (only consulted when there's no placement
    // override). Default to the first page's first widget — corner cases
    // (unusual templates with no matching widget at all) end up centred on
    // page 1, which is wrong but at least visible.
    let defaultPageIndex = 0
    let defaultRect: { x: number; y: number; width: number; height: number } | null = null
    for (const p of pages) {
      const w = p.widgets.find((w) => w.pdfFieldName === fieldName)
      if (w) {
        defaultPageIndex = p.pageIndex
        defaultRect = { x: w.x, y: w.y, width: w.width, height: w.height }
        break
      }
    }

    // Resolve final {pageIndex, x, y, width, height} in PDF user-space.
    let placement: SignaturePlacement
    if (decoded.placement) {
      placement = decoded.placement
    } else if (defaultRect) {
      const heightMultiplier = decoded.heightMultiplier ?? DEFAULT_HEIGHT_MULTIPLIER
      // Match pdf-fill's default-rect math so the on-screen position equals
      // what the user will get if they download without dragging.
      placement = computeDefaultPlacement(decoded, defaultPageIndex, defaultRect, heightMultiplier)
    } else {
      continue
    }

    const page = pages.find((p) => p.pageIndex === placement.pageIndex)
    if (!page) continue

    items.push({
      fieldName,
      value: typeof value === 'string' ? value : '',
      placement,
      page,
      decoded,
    })
  }

  return (
    <>
      {items.map((item) => (
        <SignatureDraggable
          key={item.fieldName}
          item={item}
          onChange={onPlacementChange}
        />
      ))}
    </>
  )
}

interface OverlayItem {
  fieldName: string
  value: string
  placement: SignaturePlacement
  page: PdfPageInfo
  decoded: NonNullable<ReturnType<typeof decodeSignatureValue>>
}

function SignatureDraggable({
  item,
  onChange,
}: {
  item: OverlayItem
  onChange: (pdfFieldName: string, next: string) => void
}) {
  const { page, placement, value, fieldName, decoded } = item
  // Local drag state so we don't write to react-hook-form on every pointer
  // move (which would re-render the world). Only commit on pointerup.
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)
  const startRef = useRef<{ pointerX: number; pointerY: number } | null>(null)

  // Convert PDF user-space (origin bottom-left) → CSS px on the canvas
  // (origin top-left). Flip Y, multiply by the page's CSS-per-PDF scale.
  const cssLeft = placement.x * page.scale + (drag?.dx ?? 0)
  const cssTop =
    (page.pdfHeight - placement.y - placement.height) * page.scale + (drag?.dy ?? 0)
  const cssWidth = placement.width * page.scale
  const cssHeight = placement.height * page.scale

  function onPointerDown(ev: React.PointerEvent<HTMLDivElement>) {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    startRef.current = { pointerX: ev.clientX, pointerY: ev.clientY }
    setDrag({ dx: 0, dy: 0 })
  }

  function onPointerMove(ev: React.PointerEvent<HTMLDivElement>) {
    const start = startRef.current
    if (!start) return
    setDrag({
      dx: ev.clientX - start.pointerX,
      dy: ev.clientY - start.pointerY,
    })
  }

  function onPointerUp() {
    const start = startRef.current
    if (!start) return
    startRef.current = null
    if (!drag) { setDrag(null); return }

    // Commit only if the user actually moved. Clamps the new position so
    // the image stays inside the page bounds (overflow into off-page
    // whitespace would just get clipped at render time anyway).
    const pdfDx = drag.dx / page.scale
    const pdfDy = -drag.dy / page.scale
    const nextX = clamp(placement.x + pdfDx, 0, page.pdfWidth - placement.width)
    const nextY = clamp(placement.y + pdfDy, 0, page.pdfHeight - placement.height)

    setDrag(null)
    if (Math.abs(pdfDx) < 0.5 && Math.abs(pdfDy) < 0.5) return

    const nextValue = encodeSignatureValue(value, {
      heightMultiplier: decoded.heightMultiplier,
      placement: {
        pageIndex: placement.pageIndex,
        x: nextX,
        y: nextY,
        width: placement.width,
        height: placement.height,
      },
    })
    onChange(fieldName, nextValue)
  }

  return createPortal(
    <div
      role="img"
      aria-label={`Semnătură pentru ${fieldName} — trage pentru a repoziționa`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        left: cssLeft,
        top: cssTop,
        width: cssWidth,
        height: cssHeight,
        cursor: drag ? 'grabbing' : 'grab',
        touchAction: 'none',
        // Subtle border on hover hints draggability; reset on grab so it
        // doesn't compete with the signature's outline.
        outline: drag ? '2px dashed rgba(37, 99, 235, 0.7)' : '1px dashed rgba(107, 114, 128, 0.4)',
        outlineOffset: '2px',
        backgroundImage: `url("${value.replace(/#.*$/, '')}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
    />,
    page.wrapper,
  )
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// Mirror of the math in pdf-fill's prepareSignature() default branch.
// Computes where the signature lands when the user hasn't dragged it yet.
// We have to know image dimensions here, but we don't have a PDFImage —
// the data URL's natural size is good enough for placement intent
// (browser-decoded width/height is the same the PDF would see). To avoid
// async work we use the encoded `#h=N` × widget height as the height
// directly, and width = height × image-aspect-ratio.
function computeDefaultPlacement(
  decoded: NonNullable<ReturnType<typeof decodeSignatureValue>>,
  pageIndex: number,
  widget: { x: number; y: number; width: number; height: number },
  heightMultiplier: number,
): SignaturePlacement {
  // Use raw PNG/JPEG header dims (decoded into bytes already) — same as
  // pdf-lib's embedded image, modulo orientation EXIF which we ignore.
  const img = readImageDims(decoded.bytes, decoded.kind)
  const aspect = img.width > 0 && img.height > 0 ? img.width / img.height : 3
  const heightCap = widget.height * heightMultiplier
  // Mirror pdf-fill: scale by min(widthFit, heightFit), preserve aspect.
  const widthScale = widget.width / (img.width || 1)
  const heightScale = heightCap / (img.height || 1)
  const scale = Math.min(widthScale, heightScale)
  const drawW = (img.width || aspect * heightCap) * scale
  const drawH = (img.height || heightCap) * scale
  const x = widget.x + (widget.width - drawW) / 2
  const y = widget.y // anchored at slot bottom, grows up
  return { pageIndex, x, y, width: drawW, height: drawH }
}

// Cheap PNG / JPEG dimension probe without decoding the pixels. PNG width
// + height live at bytes 16-23; JPEG SOF0/2 markers carry them. Returns
// zeros on parse failure — the caller falls back to an aspect ratio.
function readImageDims(bytes: Uint8Array, kind: 'png' | 'jpg'): { width: number; height: number } {
  if (kind === 'png' && bytes.length >= 24) {
    const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
    const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
    return { width: w, height: h }
  }
  if (kind === 'jpg') {
    // Walk JPEG segments looking for an SOF marker (0xC0..0xCF, excluding
    // 0xC4 / 0xC8 / 0xCC which are not SOF). Skip APP/COM blocks by their
    // length word.
    let i = 2 // past SOI
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue }
      const marker = bytes[i + 1]
      const SOF = (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3]
      if (SOF) {
        const h = (bytes[i + 5] << 8) | bytes[i + 6]
        const w = (bytes[i + 7] << 8) | bytes[i + 8]
        return { width: w, height: h }
      }
      i += 2 + segLen
    }
  }
  return { width: 0, height: 0 }
}
