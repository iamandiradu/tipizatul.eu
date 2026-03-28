import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <FileQuestion className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <p className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</p>
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Pagina nu a fost găsită</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Adresa accesată nu există sau a fost mutată.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Înapoi la pagina principală
      </Link>
    </div>
  )
}
