import { Link } from 'react-router-dom'
import { Calendar, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { countWords } from '../../utils/readingTime'
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
  const words = countWords(post.content)

  return (
    <div key={post.id} className="animate-in fade-in duration-200">
      <Link to={`/blog/${post.slug}`} className="block">
        <Card className="group block w-full transition-transform hover:-translate-y-1 hover:shadow-md">
          <article>
            <h2
              className={cn(
                'mb-3 text-2xl font-bold transition-colors',
                'text-slate-900 group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400'
              )}
            >
              {post.title}
            </h2>

            {post.tags && post.tags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
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
            )}

            <p className="mb-4 text-slate-600 dark:text-slate-400">
              {post.summary}
            </p>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
