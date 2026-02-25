import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { FileQuestion } from 'lucide-react'

export function NotFound() {
  const { t } = useTranslation()

  return (
    <Card className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
        <FileQuestion size={64} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h1 className="mb-4 text-3xl font-bold text-slate-800 dark:text-slate-200">
        {t('notFound.title')}
      </h1>
      <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">
        {t('notFound.description')}
      </p>
      <Link
        to="/"
        className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        {t('notFound.backHome')}
      </Link>
    </Card>
  )
}
