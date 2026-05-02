import { useEffect } from 'react'
import { useRouteError, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useDarkMode } from '@/lib/useDarkMode'

export default function ErrorPage() {
  useDarkMode()
  const error = useRouteError()

  useEffect(() => {
    console.error('[ErrorPage]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-14 h-14 text-amber-400 dark:text-amber-500 mx-auto mb-4" />
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Ceva a mers prost</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          A apărut o problemă la încărcarea paginii. Încercați să reîncărcați.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Reîncarcă pagina
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    </div>
  )
}
