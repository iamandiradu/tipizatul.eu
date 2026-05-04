import { useEffect, useRef, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface PdfPreviewProps {
  pdfBytes: ArrayBuffer | Uint8Array
}

// Renders the PDF imperatively to <canvas> nodes that we mutate in place.
// This way the wrapper DOM never collapses while a new render is in flight,
// so the browser preserves scrollTop across live-preview updates.
export default function PdfPreview({ pdfBytes }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [mobileUrl, setMobileUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

        // Reconcile canvas count — keep existing nodes (preserves scroll
        // position relative to them), append/remove only at the tail.
        while (wrapper.children.length < pdf.numPages) {
          const c = document.createElement('canvas')
          c.style.display = 'block'
          c.style.marginBottom = '8px'
          c.style.maxWidth = '100%'
          c.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          wrapper.appendChild(c)
        }
        while (wrapper.children.length > pdf.numPages) {
          wrapper.removeChild(wrapper.lastChild!)
        }

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) {
            pdf.destroy()
            return
          }
          const page = await pdf.getPage(i)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = pageWidth / baseViewport.width
          const viewport = page.getViewport({ scale })

          const canvas = wrapper.children[i - 1] as HTMLCanvasElement
          canvas.width = Math.round(viewport.width * dpr)
          canvas.height = Math.round(viewport.height * dpr)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          // annotationMode defaults to ENABLE, which paints AcroForm widgets
          // directly on the canvas — so a raw template PDF renders with its
          // form fields visible, without needing to pre-flatten.
          const transform = dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0]
          await page.render({ canvas, viewport, transform }).promise
        }

        pdf.destroy()
        if (!cancelled) setError(null)
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
        className="hidden md:block w-full h-[60vh] lg:h-[calc(100vh-7rem)] min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4"
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
