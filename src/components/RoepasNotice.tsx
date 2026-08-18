import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'

// Bump the version suffix when the wording changes, so the notice re-appears
// for people who dismissed the previous one.
const STORAGE_KEY = 'roepasNotice:v2'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export default function RoepasNotice() {
  const [dismissed, setDismissed] = useState(readDismissed)

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Private-mode / storage-disabled browsers: hide for this session only.
    }
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div
      role="region"
      aria-label="Anunț despre migrarea PCUe către ROePAS"
      className="bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-900/60 text-sky-900 dark:text-sky-200"
    >
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-start sm:items-center gap-2 text-sm">
        <Megaphone className="w-4 h-4 mt-0.5 sm:mt-0 shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0">
          <strong className="font-semibold">PCUe (eDirect) a fost înlocuit de ROePAS</strong>{' '}
          (
          <a
            href="https://roepas.ro/ro/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-sky-700 dark:hover:text-sky-100 transition-colors"
          >
            roepas.ro
          </a>
          ) — o interfață mult mai bună decât vechea platformă. Nu înlocuiește Tipizatul.eu.
        </p>
        <button
          onClick={dismiss}
          aria-label="Închide anunțul"
          title="Închide anunțul"
          className="-my-1 -mr-1 p-1.5 shrink-0 rounded-md hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
