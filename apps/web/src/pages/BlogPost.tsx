import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, FileText } from 'lucide-react'
import { Card } from '../components/Card'
import { getPostBySlug } from '../utils/posts'
import { estimateReadingTime, countWords } from '../utils/readingTime'

export function BlogPost() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const post = slug ? getPostBySlug(slug) : undefined

  if (!post) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Post not found
          </h1>
          <Link
            to="/blog"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('blog.back')}
          </Link>
        </div>
      </Card>
    )
  }

  const minutes = estimateReadingTime(post.content)
  const words = countWords(post.content)

  return (
    <Card>
      <Link
        to="/blog"
        className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← {t('blog.back')}
      </Link>

      <article className="prose prose-slate dark:prose-invert max-w-none prose-a:text-blue-600 hover:prose-a:text-blue-500 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline">
        <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">
          {post.title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.date}>
              {t('blog.publishedOn')} {post.date}
            </time>
          </div>

          {post.updated && post.updated !== post.date && (
            <div className="flex items-center gap-1 text-slate-400">
              <span>(Updated: {post.updated})</span>
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <span className="hidden sm:inline">·</span>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{t('blog.readingTime', { minutes })}</span>
          </div>
          <span className="hidden sm:inline">·</span>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{t('blog.wordCount', { count: words })}</span>
          </div>
        </div>

        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </Card>
  )
}
