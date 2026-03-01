import { Link } from 'react-router-dom'
import { Calendar, Clock, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { estimateReadingTime, countWords } from '../../utils/readingTime'
import { cn } from '../../utils/cn'

interface Post {
  id: string
  slug: string
  title: string
  date: string
  updated?: string
  tags?: string[]
  category?: string
  summary?: string
  content: string
}

interface BlogPostCardProps {
  post: Post
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const { t } = useTranslation()
  const minutes = estimateReadingTime(post.content)
  const words = countWords(post.content)

  return (
    <motion.div
      layout
      key={post.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        opacity: { duration: 0.2 },
      }}
    >
      <Card className="group block w-full transition-transform hover:-translate-y-1 hover:shadow-md">
        <article>
          <div className="mb-2 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{post.date}</span>
              </div>
              {post.category && (
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {t(`blog.categories.${post.category}`, post.category)}
                </span>
              )}
              {post.updated && post.updated !== post.date && (
                <div className="flex items-center gap-1 text-slate-400">
                  <span>(Updated: {post.updated})</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {post.tags?.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium',
                    'text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <Link to={`/blog/${post.slug}`} className="block">
            <h2
              className={cn(
                'mb-3 text-2xl font-bold transition-colors',
                'text-slate-900 group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400'
              )}
            >
              {post.title}
            </h2>
          </Link>

          <p className="mb-4 text-slate-600 dark:text-slate-400">
            {post.summary}
          </p>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{t('blog.readingTime', { minutes })}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{t('blog.wordCount', { count: words })}</span>
              </div>
            </div>
            <Link
              to={`/blog/${post.slug}`}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('blog.readMore')} →
            </Link>
          </div>
        </article>
      </Card>
    </motion.div>
  )
}
