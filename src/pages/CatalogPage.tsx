import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { fetchAllTemplates } from '@/lib/firestore'
import type { Template } from '@/types/template'

function TemplateCard({ template }: { template: Template }) {
  const fieldCount = template.fields.filter((f) => !f.hidden).length

  return (
    <Link
      to={`/fill/${template.id}`}
      className="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{template.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {template.category && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                {template.category}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">{fieldCount} câmpuri</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function CatalogPage() {
  const [templates, setTemplates] = useState<Template[] | undefined>(undefined)

  useEffect(() => {
    fetchAllTemplates()
      .then(setTemplates)
      .catch((err) => {
        console.error('[CatalogPage] Failed to load templates:', err)
        setTemplates([])
      })
  }, [])

  if (templates === undefined) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">Se încarcă...</div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Niciun formular disponibil</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Adăugați formulare din secțiunea{' '}
          <Link to="/admin" className="text-blue-600 dark:text-blue-400 hover:underline">
            Admin
          </Link>
          .
        </p>
      </div>
    )
  }

  const byCategory = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category || 'Altele'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Formulare disponibile</h1>
      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
