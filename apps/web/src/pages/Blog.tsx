import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Calendar, Clock, FileText } from 'lucide-react'
import { Card } from '../components/Card'
import { getAllPosts } from '../lib/posts'
import { estimateReadingTime, countWords } from '../utils/readingTime'

export function Blog() {
  const { t } = useTranslation()
  const posts = getAllPosts()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.blog')}</h1>
      </div>

      <div className="grid gap-6">
        {posts.map((post) => {
          const minutes = estimateReadingTime(post.content)
          const words = countWords(post.content)

          return (
            <Card
              key={post.id}
              className="group block transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <article>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{post.date}</span>
                    </div>
                    {post.updated && post.updated !== post.date && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>(Updated: {post.updated})</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {post.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <Link to={`/blog/${post.slug}`} className="block">
                  <h2 className="mb-3 text-2xl font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {post.title}
                  </h2>
                </Link>

                <p className="mb-4 text-slate-600 dark:text-slate-300">
                  {post.summary}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500">
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
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {t('blog.readMore')} →
                  </Link>
                </div>
              </article>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
