import { useState, useRef, useEffect } from 'react'
import { submitProposal } from '@/lib/firestore'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ProposalWidget({ open, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Autofocus title on open + restore focus to trigger on close
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    titleRef.current?.focus()
    return () => { previouslyFocused?.focus() }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid the opening click triggering close
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setError('')
      setSuccess(false)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Titlul este obligatoriu.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitProposal(trimmed, description.trim())
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch {
      setError('Eroare la trimitere. Încercați din nou.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="proposal-heading"
      id="proposal-panel"
      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50"
    >
      {success ? (
        <p className="text-green-600 dark:text-green-400 text-sm font-medium text-center py-4">
          Mulțumim pentru sugestie!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <h2 id="proposal-heading" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Propune un formular
          </h2>

          <div>
            <label htmlFor="proposal-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titlu <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(obligatoriu)</span>
            </label>
            <input
              id="proposal-title"
              ref={titleRef}
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-base placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="proposal-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descriere
            </label>
            <textarea
              id="proposal-description"
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-base placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 transition-colors"
          >
            {submitting ? 'Se trimite...' : 'Trimite'}
          </button>
        </form>
      )}
    </div>
  )
}
