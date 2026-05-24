import { Link } from 'react-router-dom'
import { Calendar, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/utils/image'
import type { BlogPostSummary } from '@/types'
import { CategoryLabel } from './CategoryLabel'
import type { CSSProperties } from 'react'

interface BlogPostCardProps {
  post: BlogPostSummary
  className?: string
  style?: CSSProperties
}

export function BlogPostCard({ post, className, style }: BlogPostCardProps) {
  const { t } = useTranslation()
  const words = post.wordCount ?? 0
  const coverImage = post.image ? getOptimizedImageUrl(post.image, 'card') : ''
  const titleClass = cn(
    'mb-2 line-clamp-2 text-2xl font-medium leading-snug transition-colors',
    'text-slate-900 group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400'
  )
  const summaryClass =
    'text-sm leading-6 text-[var(--text-secondary)] sm:text-[0.95rem]'
  const metaClass =
    'mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-2 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400'

  // Layout A: no cover image, text-only card.
  if (!coverImage) {
    return (
      <div
        className={cn('animate-in fade-in duration-200', className)}
        style={style}
      >
        <Link to={`/blog/${post.slug}`} className="block">
          <Card className="group block border-0 p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.45)] transition-transform hover:-translate-y-1 hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.5)] sm:p-5 dark:border-0">
            <article>
              {/* Title */}
              <h2 className={titleClass}>{post.title}</h2>

              {/* Summary */}
              <p className={cn('mb-3 line-clamp-3', summaryClass)}>
                {post.summary}
              </p>

              {/* Meta info row: category + date + word count */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                  {post.category && <CategoryLabel category={post.category} />}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{t('blog.wordCount', { count: words })}</span>
                  </div>
                </div>
              </div>
            </article>
          </Card>
        </Link>
      </div>
    )
  }

  // Layout B: cover image present, split card (image + text).
  return (
    <div
      className={cn('animate-in fade-in duration-200', className)}
      style={style}
    >
      <Link to={`/blog/${post.slug}`} className="block">
        <Card className="group block overflow-hidden border-0 p-0 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.45)] transition-transform hover:-translate-y-1 hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.5)] sm:p-0 dark:border-0">
          {/* Mobile template */}
          <article className="flex min-h-[220px] flex-col sm:hidden">
            {/* Image (top, golden ratio portion) */}
            <div className="relative isolate h-[120px] overflow-hidden [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_60%,rgba(0,0,0,0.4)_82%,rgba(0,0,0,0)_100%)] [-webkit-mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_60%,rgba(0,0,0,0.4)_82%,rgba(0,0,0,0)_100%)]">
              <div className="h-full w-full">
                <img
                  src={coverImage}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Text (bottom, overlaps image for aesthetics) */}
            <div className="-mt-10 flex min-w-0 flex-1 flex-col overflow-hidden bg-white p-3 pt-6 sm:mt-0 dark:bg-[#17191c]">
              <h2 className={titleClass}>{post.title}</h2>

              <p className={cn('mb-2 pb-4', summaryClass)}>{post.summary}</p>

              <div className={metaClass}>
                {post.category && <CategoryLabel category={post.category} />}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{t('blog.wordCount', { count: words })}</span>
                </div>
              </div>
            </div>
          </article>

          {/* Desktop template */}
          <article className="hidden min-h-[170px] sm:grid sm:grid-cols-[minmax(0,1.618fr)_minmax(0,1fr)] sm:grid-rows-1">
            {/* Text (left) */}
            <div className="relative z-10 order-1 flex min-w-0 flex-col overflow-hidden p-4">
              <h2 className={titleClass}>{post.title}</h2>

              <p className={cn('mb-2 pb-6', summaryClass)}>{post.summary}</p>

              <div className={metaClass}>
                {post.category && <CategoryLabel category={post.category} />}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{t('blog.wordCount', { count: words })}</span>
                </div>
              </div>
            </div>

            {/* Image (right, golden ratio portion) */}
            <div className="relative isolate order-2 overflow-visible">
              <div className="absolute inset-0 -left-10 w-[calc(100%+2.5rem)] [mask-image:linear-gradient(to_left,black_0%,black_78%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_0%,black_78%,transparent_100%)]">
                <img
                  src={coverImage}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </article>
        </Card>
      </Link>
    </div>
  )
}
