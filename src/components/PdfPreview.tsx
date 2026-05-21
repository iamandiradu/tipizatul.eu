import { useEffect, useRef, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export interface PdfPageWidgetRect {
  pdfFieldName: string
  // PDF user-space (origin bottom-left). Same coordinate system pdf-lib uses
  // so consumers can hand these straight back to fillPdf.
  x: number
  y: number
  width: number
  height: number
}

export interface PdfPageInfo {
  pageIndex: number                 // 0-based
  // The wrapper element that owns the canvas — overlay portals mount here.
  // `position: relative` is set so absolutely-positioned children align
  // with the canvas rather than the scroll container.
  wrapper: HTMLElement
  canvas: HTMLCanvasElement
  // CSS pixels per PDF unit. Same for x and y (uniform scale).
  scale: number
  // PDF user-space dimensions of the page.
  pdfWidth: number
  pdfHeight: number
  widgets: PdfPageWidgetRect[]
}

interface PdfPreviewProps {
  pdfBytes: ArrayBuffer | Uint8Array
  onPagesReady?: (pages: PdfPageInfo[]) => void
}

// Renders the PDF imperatively to <canvas> nodes that we mutate in place.
// This way the wrapper DOM never collapses while a new render is in flight,
// so the browser preserves scrollTop across live-preview updates.
export default function PdfPreview({ pdfBytes, onPagesReady }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [mobileUrl, setMobileUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Keep the latest callback in a ref so we don't have to add it as an
  // effect dep (which would re-render the PDF on every parent render).
  const onPagesReadyRef = useRef(onPagesReady)
  useEffect(() => { onPagesReadyRef.current = onPagesReady }, [onPagesReady])

  // Mobile fallback: hand off to the OS PDF viewer in a new tab.
  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setMobileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pdfBytes])

  useEffect(() => {
    let cancelled = false
    // Clone bytes — pdfjs may transfer the underlying buffer to its worker,
    // and we don't want to invalidate the caller's reference.
    const view = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
    const copy = new Uint8Array(view.length)
    copy.set(view)

    const task = pdfjsLib.getDocument({ data: copy })

    task.promise
      .then(async (pdf) => {
        if (cancelled) {
          pdf.destroy()
          return
        }
        const container = containerRef.current
        const wrapper = wrapperRef.current
        if (!container || !wrapper) {
          pdf.destroy()
          return
        }

        const containerWidth = container.clientWidth
        const pageWidth = Math.max(200, containerWidth - 32)
        const dpr = window.devicePixelRatio || 1

        // Each page lives in a `position: relative` wrapper so overlay
        // children align with the canvas; the wrapper holds both the
        // canvas and any portal-mounted children. Reconcile by index to
        // preserve scroll position when re-rendering.
        while (wrapper.children.length < pdf.numPages) {
          const pageWrap = document.createElement('div')
          pageWrap.style.position = 'relative'
          pageWrap.style.marginBottom = '8px'
          pageWrap.style.maxWidth = '100%'
          pageWrap.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          pageWrap.style.lineHeight = '0' // collapse the canvas's baseline gap
          const c = document.createElement('canvas')
          c.style.display = 'block'
          c.style.maxWidth = '100%'
          pageWrap.appendChild(c)
          wrapper.appendChild(pageWrap)
        }
        while (wrapper.children.length > pdf.numPages) {
          wrapper.removeChild(wrapper.lastChild!)
        }

        const pageInfos: PdfPageInfo[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) {
            pdf.destroy()
            return
          }
          const page = await pdf.getPage(i)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = pageWidth / baseViewport.width
          const viewport = page.getViewport({ scale })

          const pageWrap = wrapper.children[i - 1] as HTMLElement
          const canvas = pageWrap.firstElementChild as HTMLCanvasElement
          const newW = Math.round(viewport.width * dpr)
          const newH = Math.round(viewport.height * dpr)

          // Render off-screen first, then drawImage onto the visible canvas in
          // one atomic paint. pdfjs.render() fills white before drawing the
          // page, and resizing canvas.width/height clears the bitmap — both
          // cause a visible flicker when the user is just typing into a field.
          // annotationMode defaults to ENABLE, so AcroForm widgets render
          // directly on the canvas without needing to pre-flatten.
          const offscreen = document.createElement('canvas')
          offscreen.width = newW
          offscreen.height = newH
          const transform = dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0]
          await page.render({ canvas: offscreen, viewport, transform }).promise

          if (cancelled) {
            pdf.destroy()
            return
          }

          if (canvas.width !== newW || canvas.height !== newH) {
            canvas.width = newW
            canvas.height = newH
            canvas.style.width = `${viewport.width}px`
            canvas.style.height = `${viewport.height}px`
          }
          // Match the wrapper to the canvas so absolutely-positioned children
          // can be sized in CSS px relative to it.
          pageWrap.style.width = `${viewport.width}px`
          pageWrap.style.height = `${viewport.height}px`

          const ctx = canvas.getContext('2d')
          if (ctx) ctx.drawImage(offscreen, 0, 0)

          // Harvest widget rects for any consumer that wants to overlay
          // signatures, watermarks, etc. PDF user-space (bottom-left
          // origin) — same coordinates pdf-lib uses, so they round-trip
          // straight back into fillPdf without conversion.
          const widgets: PdfPageWidgetRect[] = []
          try {
            const annots = await page.getAnnotations()
            for (const a of annots) {
              if (a.subtype !== 'Widget') continue
              if (!a.fieldName || !a.rect) continue
              const [x1, y1, x2, y2] = a.rect as [number, number, number, number]
              widgets.push({
                pdfFieldName: a.fieldName,
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
              })
            }
          } catch (err) {
            console.warn('[PdfPreview] getAnnotations failed', err)
          }

          pageInfos.push({
            pageIndex: i - 1,
            wrapper: pageWrap,
            canvas,
            scale,
            pdfWidth: baseViewport.width,
            pdfHeight: baseViewport.height,
            widgets,
          })
        }

        pdf.destroy()
        if (!cancelled) {
          setError(null)
          onPagesReadyRef.current?.(pageInfos)
        }
      })
      .catch((err) => {
        if (cancelled) return
        // `RenderingCancelledException` is expected when bytes change mid-render.
        if (err?.name === 'RenderingCancelledException') return
        console.warn('[PdfPreview]', err)
        setError(err instanceof Error ? err.message : 'Eroare la afișarea PDF-ului.')
      })

    return () => {
      cancelled = true
      task.destroy()
    }
  }, [pdfBytes])

  return (
    <>
      {/* Mobile: inline PDFs are unreliable; hand off to OS viewer */}
      {mobileUrl && (
        <a
          href={mobileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="md:hidden flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Deschide formularul (PDF) într-o filă nouă"
        >
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Deschide PDF-ul
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Se deschide cu vizualizatorul telefonului
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
        </a>
      )}

      <div
        ref={containerRef}
        className="scrollbar-subtle hidden md:block w-full h-[60vh] lg:h-[calc(100vh-7rem)] min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4"
        aria-label="Previzualizare formular"
      >
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <div ref={wrapperRef} className="flex flex-col items-center" />
        )}
      </div>
    </>
  )
}
