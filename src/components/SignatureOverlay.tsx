import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TemplateField } from '@/types/template'
import type { PdfPageInfo } from './PdfPreview'
import type { WidgetRect } from '@/lib/pdf-widget-rects'
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
  // Widget rects harvested from the *original* pdfBytes — fillPdf's
  // flatten() strips them out of the live preview, so we can't rely on
  // PdfPreview's per-render harvest. Source: lib/pdf-widget-rects.ts.
  widgetRects: WidgetRect[]
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
  widgetRects,
  fields,
  values,
  onPlacementChange,
}: SignatureOverlayProps) {
  const sigFieldNames = new Set(
    fields.filter(isSignatureField).map((f) => f.pdfFieldName),
  )
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
    // override). Sourced from the original-document harvest, so the
    // lookup survives fillPdf's flatten() stripping the widgets out of
    // the live preview bytes.
    const widget = widgetRects.find((w) => w.pdfFieldName === fieldName)
    const defaultPageIndex = widget?.pageIndex ?? 0
    const defaultRect = widget
      ? { x: widget.x, y: widget.y, width: widget.width, height: widget.height }
      : null

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
  const [resize, setResize] = useState<{ dx: number; dy: number } | null>(null)
  const dragStartRef = useRef<{ pointerX: number; pointerY: number } | null>(null)
  const resizeStartRef = useRef<{ pointerX: number; pointerY: number } | null>(null)

  // Aspect-locked resize: signatures look wrong when squished, so the SE
  // corner handle scales the box uniformly. Pick the dominant axis (the
  // one that grew most relative to the original) so the user gets the
  // expected feel whether they drag mostly horizontally or vertically.
  const resizeScale = (() => {
    if (!resize) return 1
    const dxPdf = resize.dx / page.scale
    const dyPdf = resize.dy / page.scale
    const sxRatio = (placement.width + dxPdf) / placement.width
    const syRatio = (placement.height + dyPdf) / placement.height
    return Math.max(0.1, Math.max(sxRatio, syRatio))
  })()

  // Convert PDF user-space (origin bottom-left) → CSS px on the canvas
  // (origin top-left). Flip Y, multiply by the page's CSS-per-PDF scale.
  // The transient drag and resize deltas adjust the displayed rectangle
  // so the user sees their action in real time before the form value
  // catches up on pointerup.
  const cssWidth = placement.width * page.scale * resizeScale
  const cssHeight = placement.height * page.scale * resizeScale
  // Anchor the SE-corner resize at the top-left so it grows down+right
  // (the visual model of Paint-style corner drag).
  const cssLeft = placement.x * page.scale + (drag?.dx ?? 0)
  const cssTop =
    (page.pdfHeight - placement.y - placement.height) * page.scale + (drag?.dy ?? 0)

  // ── Body drag (move) ───────────────────────────────────────────────────
  function onDragPointerDown(ev: React.PointerEvent<HTMLDivElement>) {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    dragStartRef.current = { pointerX: ev.clientX, pointerY: ev.clientY }
    setDrag({ dx: 0, dy: 0 })
  }

  function onDragPointerMove(ev: React.PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current
    if (!start) return
    setDrag({
      dx: ev.clientX - start.pointerX,
      dy: ev.clientY - start.pointerY,
    })
  }

  function onDragPointerUp() {
    const start = dragStartRef.current
    if (!start) return
    dragStartRef.current = null
    if (!drag) { setDrag(null); return }

    const pdfDx = drag.dx / page.scale
    const pdfDy = -drag.dy / page.scale
    const nextX = clamp(placement.x + pdfDx, 0, page.pdfWidth - placement.width)
    const nextY = clamp(placement.y + pdfDy, 0, page.pdfHeight - placement.height)

    setDrag(null)
    if (Math.abs(pdfDx) < 0.5 && Math.abs(pdfDy) < 0.5) return

    commitPlacement({
      pageIndex: placement.pageIndex,
      x: nextX,
      y: nextY,
      width: placement.width,
      height: placement.height,
    })
  }

  // ── Corner resize ──────────────────────────────────────────────────────
  // The handle stops pointer propagation so dragging it doesn't trigger
  // the body's move handlers. Setting pointer capture is essential or the
  // pointer events go to whatever's underneath as soon as the cursor
  // leaves the small handle area.
  function onResizePointerDown(ev: React.PointerEvent<HTMLDivElement>) {
    ev.stopPropagation()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    resizeStartRef.current = { pointerX: ev.clientX, pointerY: ev.clientY }
    setResize({ dx: 0, dy: 0 })
  }

  function onResizePointerMove(ev: React.PointerEvent<HTMLDivElement>) {
    const start = resizeStartRef.current
    if (!start) return
    ev.stopPropagation()
    setResize({
      dx: ev.clientX - start.pointerX,
      dy: ev.clientY - start.pointerY,
    })
  }

  function onResizePointerUp(ev: React.PointerEvent<HTMLDivElement>) {
    ev.stopPropagation()
    const start = resizeStartRef.current
    if (!start) return
    resizeStartRef.current = null
    if (!resize) { setResize(null); return }

    // SE-corner drag keeps the top-left fixed and grows the box down+right.
    // Aspect-locked: the dominant axis sets the scale, the other follows.
    // Min size guards against accidental zero/negative dimensions (e.g.
    // dragging far up-and-left would otherwise invert the rect).
    const MIN_PDF = 8 // PDF user-space units; ~1/9 inch
    const targetW = Math.max(MIN_PDF, placement.width * resizeScale)
    const targetH = Math.max(MIN_PDF, placement.height * resizeScale)
    // Keep the top anchored: y' + height' = old_y + old_height
    const oldTop = placement.y + placement.height
    const newY = clamp(oldTop - targetH, 0, page.pdfHeight - targetH)
    const newW = clamp(targetW, MIN_PDF, page.pdfWidth - placement.x)

    setResize(null)
    if (Math.abs(newW - placement.width) < 0.5 && Math.abs(targetH - placement.height) < 0.5) return

    commitPlacement({
      pageIndex: placement.pageIndex,
      x: placement.x,
      y: newY,
      width: newW,
      height: targetH,
    })
  }

  function commitPlacement(p: SignaturePlacement) {
    onChange(
      fieldName,
      encodeSignatureValue(value, {
        heightMultiplier: decoded.heightMultiplier,
        placement: p,
      }),
    )
  }

  return createPortal(
    <div
      role="img"
      aria-label={`Semnătură pentru ${fieldName} — trage pentru a repoziționa, colț pentru a redimensiona`}
      onPointerDown={onDragPointerDown}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      onPointerCancel={onDragPointerUp}
      style={{
        position: 'absolute',
        left: cssLeft,
        top: cssTop,
        width: cssWidth,
        height: cssHeight,
        cursor: drag ? 'grabbing' : 'grab',
        touchAction: 'none',
        outline:
          drag || resize
            ? '2px dashed rgba(37, 99, 235, 0.7)'
            : '1px dashed rgba(107, 114, 128, 0.4)',
        outlineOffset: '2px',
        backgroundImage: `url("${value.replace(/#.*$/, '')}")`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
    >
      <div
        aria-label="Redimensionează semnătura"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        style={{
          position: 'absolute',
          right: -6,
          bottom: -6,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          touchAction: 'none',
          backgroundColor: 'rgba(37, 99, 235, 0.95)',
          border: '1.5px solid white',
          borderRadius: 2,
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />
    </div>,
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
