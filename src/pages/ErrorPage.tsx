import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useDarkMode } from '@/lib/useDarkMode'

export default function ErrorPage() {
  useDarkMode()
  const error = useRouteError()

  let message = 'A apărut o eroare neașteptată.'
  if (isRouteErrorResponse(error)) {
    message = error.statusText || message
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-14 h-14 text-amber-400 dark:text-amber-500 mx-auto mb-4" />
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Ceva a mers prost</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-mono break-all">{message}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  )
}
