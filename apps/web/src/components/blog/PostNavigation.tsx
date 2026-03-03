import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BlogPost } from '../../types'

interface PostNavigationProps {
  prev?: BlogPost
  next?: BlogPost
}

export function PostNavigation({ prev, next }: PostNavigationProps) {
  const { t } = useTranslation()

  if (!prev && !next) return null

  return (
    <nav className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          to={`/blog/${prev.slug}`}
          className="group flex flex-col items-start gap-1 rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-400 dark:hover:bg-slate-800/50"
        >
          <span className="flex items-center text-xs text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400">
            <ChevronLeft size={14} className="mr-1" />
            {t('blog.prevPost')}
          </span>
          <span className="line-clamp-1 text-sm font-medium text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            {prev.title}
          </span>
          <time className="text-xs text-slate-500 dark:text-slate-400">
            {prev.date}
          </time>
        </Link>
      ) : (
        <div /> // Empty placeholder
      )}

      {next ? (
        <Link
          to={`/blog/${next.slug}`}
          className="group flex flex-col items-end gap-1 rounded-lg border border-slate-200 p-4 text-right transition-colors hover:border-blue-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-400 dark:hover:bg-slate-800/50"
        >
          <span className="flex items-center text-xs text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400">
            {t('blog.nextPost')}
            <ChevronRight size={14} className="ml-1" />
          </span>
          <span className="line-clamp-1 text-sm font-medium text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            {next.title}
          </span>
          <time className="text-xs text-slate-500 dark:text-slate-400">
            {next.date}
          </time>
        </Link>
      ) : (
        <div /> // Empty placeholder
      )}
    </nav>
  )
}
