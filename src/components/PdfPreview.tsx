import { useEffect, useState } from 'react'

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
    <iframe
      src={url}
      className="w-full h-[60vh] min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg"
      title="Previzualizare formular"
    />
  )
}
