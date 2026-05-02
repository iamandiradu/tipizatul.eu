import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { fetchUserVote, getDeviceId, submitVote } from '@/lib/votes'
import type { VoteValue } from '@/types/template'

interface VoteWidgetProps {
  templateId: string
  initialUp?: number
  initialDown?: number
}

// Sits beside the download buttons on FillPage. Anonymous one-vote-per-device
// per template via a UUID in localStorage; clicking the un-voted thumb after
// voting flips your vote. Comment is optional (and emphasized on thumbs-down).
export default function VoteWidget({ templateId, initialUp = 0, initialDown = 0 }: VoteWidgetProps) {
  const [deviceId, setDeviceId] = useState('')
  const [value, setValue] = useState<VoteValue | null>(null)
  const [comment, setComment] = useState('')
  const [savedComment, setSavedComment] = useState('')
  const [up, setUp] = useState(initialUp)
  const [down, setDown] = useState(initialDown)
  const [submitting, setSubmitting] = useState(false)
  const [savedAck, setSavedAck] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = getDeviceId()
    setDeviceId(id)
    if (!id) return
    fetchUserVote(templateId, id)
      .then((existing) => {
        if (!existing) return
        setValue(existing.value)
        const c = existing.comment ?? ''
        setComment(c)
        setSavedComment(c)
      })
      .catch(() => { /* non-fatal — widget falls back to no-vote state */ })
  }, [templateId])

  async function cast(next: VoteValue) {
    if (submitting) return
    if (!deviceId) return
    // Re-clicking the same thumb is a no-op so we don't fight the user's
    // "already voted" mental model. They can still edit the comment by
    // typing and clicking save.
    if (next === value) return
    setError(null)
    setSubmitting(true)
    try {
      await submitVote({ templateId, deviceId, value: next, comment: comment || null })
      // Optimistically reconcile counters with the new vote.
      if (value === null) {
        if (next === 1) setUp((n) => n + 1)
        else setDown((n) => n + 1)
      } else if (value !== next) {
        if (value === 1) setUp((n) => Math.max(0, n - 1))
        else setDown((n) => Math.max(0, n - 1))
        if (next === 1) setUp((n) => n + 1)
        else setDown((n) => n + 1)
      }
      setValue(next)
      setSavedComment(comment)
      setSavedAck(true)
      setTimeout(() => setSavedAck(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut salva votul.')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveCommentOnly() {
    if (submitting || !deviceId || value === null) return
    if (comment === savedComment) return
    setError(null)
    setSubmitting(true)
    try {
      await submitVote({ templateId, deviceId, value, comment: comment || null })
      setSavedComment(comment)
      setSavedAck(true)
      setTimeout(() => setSavedAck(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut salva comentariul.')
    } finally {
      setSubmitting(false)
    }
  }

  const upActive = value === 1
  const downActive = value === -1
  const showCommentBox = value !== null
  const commentLabel = value === -1 ? 'Ce nu a mers? (opțional)' : 'Comentariu (opțional)'
  const commentDirty = comment !== savedComment

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          A funcționat acest formular?
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => cast(1)}
            disabled={submitting}
            aria-pressed={upActive}
            aria-label="Vot pozitiv"
            className={
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors ' +
              (upActive
                ? 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800') +
              ' disabled:opacity-60 disabled:cursor-not-allowed'
            }
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="tabular-nums">{up}</span>
          </button>

          <button
            type="button"
            onClick={() => cast(-1)}
            disabled={submitting}
            aria-pressed={downActive}
            aria-label="Vot negativ"
            className={
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors ' +
              (downActive
                ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800') +
              ' disabled:opacity-60 disabled:cursor-not-allowed'
            }
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="tabular-nums">{down}</span>
          </button>
        </div>

        {savedAck && !error && (
          <span className="text-xs text-green-600 dark:text-green-400">Mulțumim!</span>
        )}
      </div>

      {showCommentBox && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`vote-comment-${templateId}`} className="text-xs text-gray-500 dark:text-gray-400">
            {commentLabel}
          </label>
          <div className="flex items-start gap-2">
            <textarea
              id={`vote-comment-${templateId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder={value === -1 ? 'ex: câmpurile pentru CNP nu sunt detectate' : ''}
              className="flex-1 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={saveCommentOnly}
              disabled={submitting || !commentDirty}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvează'}
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
