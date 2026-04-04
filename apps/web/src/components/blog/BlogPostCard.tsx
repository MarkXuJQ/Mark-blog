import { Link } from 'react-router-dom'
import { Calendar, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { countWords } from '../../utils/readingTime'
import { cn } from '../../utils/cn'
import { getImageUrl } from '../../utils/image'
import type { BlogPost } from '../../types'

interface BlogPostCardProps {
  post: BlogPost
}

type SummaryProfile = 'short' | 'medium' | 'long'

function getSummaryProfile(summary?: string): SummaryProfile {
  const text = summary?.replace(/\s+/g, ' ').trim() || ''
  const cjkCount = (text.match(/[\u3400-\u9fff]/g) || []).length
  const nonCjkCount = Math.max(0, text.length - cjkCount)
  const score = cjkCount + nonCjkCount * 0.55

  if (score >= 120) return 'long'
  if (score >= 72) return 'medium'
  return 'short'
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const { t } = useTranslation()
  const words = countWords(post.content)
  const coverImage = post.image ? getImageUrl(post.image) : ''
  const summaryProfile = getSummaryProfile(post.summary)

  if (!coverImage) {
    return (
      <div key={post.id} className="animate-in fade-in duration-200">
        <Link to={`/blog/${post.slug}`} className="block">
          <Card className="group block p-4 sm:p-5 transition-transform hover:-translate-y-1 hover:shadow-md">
            <article>
              <h2
                className={cn(
                  'mb-2 text-[1.35rem] font-bold leading-snug transition-colors sm:text-[1.55rem]',
                  'text-slate-900 group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400'
                )}
              >
                {post.title}
              </h2>

              <p className="mb-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-[0.95rem]">
                {post.summary}
              </p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {post.category && (
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {t(`blog.categories.${post.category}`, post.category)}
                    </span>
                  )}
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

  return (
    <div key={post.id} className="animate-in fade-in duration-200">
      <Link to={`/blog/${post.slug}`} className="block">
        <Card className="group block overflow-hidden p-0 sm:p-0 transition-transform hover:-translate-y-1 hover:shadow-md">
          <article
            className={cn(
              'grid min-h-full grid-cols-1 grid-rows-[120px_auto] sm:grid-cols-[minmax(0,1.88fr)_148px] sm:grid-rows-1',
              summaryProfile === 'short' && 'sm:h-[140px]',
              summaryProfile === 'medium' && 'sm:h-[158px]',
              summaryProfile === 'long' && 'sm:h-[176px]'
            )}
          >
            <div className="order-2 flex min-w-0 flex-col overflow-hidden p-4 sm:order-1 sm:p-4">
              <h2
                className={cn(
                  'mb-2 line-clamp-2 text-[1.1rem] font-bold leading-snug transition-colors sm:text-[1.18rem]',
                  'text-slate-900 group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400'
                )}
              >
                {post.title}
              </h2>

              <p
                className={cn(
                  'mb-3 line-clamp-3 text-sm leading-5 text-slate-600 dark:text-slate-400 sm:text-[0.88rem]',
                  summaryProfile === 'short' && 'sm:line-clamp-2',
                  summaryProfile !== 'short' && 'sm:line-clamp-3'
                )}
              >
                {post.summary}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-[0.72rem] text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:text-[0.68rem]">
                {post.category && (
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {t(`blog.categories.${post.category}`, post.category)}
                  </span>
                )}
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

            <div className="order-1 relative isolate overflow-hidden bg-slate-100 dark:bg-slate-800 sm:order-2">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent dark:from-black/20 dark:via-transparent dark:to-transparent sm:bg-gradient-to-l sm:from-black/10 sm:via-transparent sm:to-slate-50/40 dark:sm:from-black/25 dark:sm:to-slate-950/35" />
            </div>
          </article>
        </Card>
      </Link>
    </div>
  )
}
