import { useEffect, useId, useRef, useState } from 'react'
import { PenLine, X } from 'lucide-react'
import type { TemplateField } from '@/types/template'
import SignaturePad from './SignaturePad'

interface SignatureFieldProps {
  field: TemplateField
  value: string                                // current data-URL ('' when unsigned)
  onChange: (next: string) => void             // wired to react-hook-form setValue
  errorMessage?: string
}

// Wrapper used in place of the text input when the detected field is a
// signature slot. Stores the signature as a data URL on the form (so RHF
// draft persistence, dirty tracking and submit serialisation all work the
// same way as for any other text field) and opens the SignaturePad in a
// dropdown when the user wants to (re)sign.
export default function SignatureField({
  field,
  value,
  onChange,
  errorMessage,
}: SignatureFieldProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const reactId = useId()
  const errorId = `${reactId}-error`
  const hasSignature = Boolean(value)

  // Close on outside click + Escape. The pad lives in a positioned
  // dropdown rather than a full modal so users can keep the rest of the
  // form visible while signing.
  useEffect(() => {
    if (!open) return
    function onPointer(ev: PointerEvent) {
      const w = wrapperRef.current
      if (!w) return
      if (!w.contains(ev.target as Node)) setOpen(false)
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {field.label}
        {field.isRequired && (
          <>
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            <span className="sr-only"> (obligatoriu)</span>
          </>
        )}
      </label>

      <div className="flex items-stretch gap-2">
        <div
          className="flex-1 min-h-[60px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center px-3 py-2"
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={errorMessage ? true : undefined}
        >
          {hasSignature ? (
            <img
              src={value}
              alt="Semnătura curentă"
              className="max-h-12 object-contain"
            />
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">Nesemnat</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <PenLine className="w-4 h-4" />
          {hasSignature ? 'Modifică' : 'Semnează'}
        </button>
        {hasSignature && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Șterge semnătura"
            className="inline-flex items-center justify-center px-2 py-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-2 left-0 right-0">
          <SignaturePad
            value={value}
            onChange={(next) => onChange(next)}
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      {errorMessage && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
