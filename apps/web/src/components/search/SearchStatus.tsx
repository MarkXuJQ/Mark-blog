import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface SearchStatusProps {
  query: string
  count: number
  onClear: () => void
}

export function SearchStatus({ query, count, onClear }: SearchStatusProps) {
  const { t } = useTranslation()

  if (!query) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {t('blog.search.resultsFor')}:{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {query}
        </span>
        <span className="ml-1 text-xs text-slate-400">({count})</span>
      </span>
      <button
        onClick={onClear}
        className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <X size={12} />
        {t('blog.search.clear')}
      </button>
    </div>
  )
}
