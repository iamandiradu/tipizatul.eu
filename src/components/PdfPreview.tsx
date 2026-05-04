import { useEffect, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'

interface PdfPreviewProps {
  pdfBytes: ArrayBuffer
}

export default function PdfPreview({ pdfBytes }: PdfPreviewProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [pdfBytes])

  if (!url) return null

  return (
    <>
      {/* Mobile: inline PDF iframes are unreliable (Android Chrome blocks them,
          iOS Safari renders only page 1 unscrollable). Hand off to the OS's
          native PDF viewer in a new tab — better zoom, search, share. */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="md:hidden flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label="Deschide formularul original (PDF) într-o filă nouă"
      >
        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Deschide PDF-ul original
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Se deschide cu vizualizatorul telefonului
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
      </a>

      <iframe
        src={url}
        className="hidden md:block w-full h-[60vh] lg:h-[calc(100vh-7rem)] min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg"
        title="Previzualizare formular"
      />
    </>
  )
}
