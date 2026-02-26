import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Calendar, Clock, FileText } from 'lucide-react'
import { Card } from '../components/Card'
import { getAllPosts } from '../utils/posts'
import { estimateReadingTime, countWords } from '../utils/readingTime'
import { cn } from '../utils/cn'
// 精简后：不再从页面组件渲染左右侧栏，交由 BlogLayout 统一处理

export function Blog() {
  const { t } = useTranslation()
  const posts = getAllPosts()

  return (
    <>
      <h1 className={styles.title}>{t('nav.blog')}</h1>
      <div className={styles.postsList}>
        {posts.map((post) => {
          const minutes = estimateReadingTime(post.content)
          const words = countWords(post.content)

          return (
            <Card key={post.id} className={styles.postCard}>
              <article>
                <div className={styles.metaContainer}>
                  <div className={styles.dateContainer}>
                    <div className={styles.iconText}>
                      <Calendar className="h-4 w-4" />
                      <span>{post.date}</span>
                    </div>
                    {post.updated && post.updated !== post.date && (
                      <div className={styles.updatedText}>
                        <span>(Updated: {post.updated})</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.tagsContainer}>
                    {post.tags?.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <Link to={`/blog/${post.slug}`} className="block">
                  <h2 className={styles.postTitle}>
                    {post.title}
                  </h2>
                </Link>

                <p className={styles.summary}>
                  {post.summary}
                </p>

                <div className={styles.footer}>
                  <div className={styles.statsContainer}>
                    <div className={styles.iconText}>
                      <Clock className="h-4 w-4" />
                      <span>{t('blog.readingTime', { minutes })}</span>
                    </div>
                    <span>·</span>
                    <div className={styles.iconText}>
                      <FileText className="h-4 w-4" />
                      <span>{t('blog.wordCount', { count: words })}</span>
                    </div>
                  </div>
                  <Link
                    to={`/blog/${post.slug}`}
                    className={styles.readMore}
                  >
                    {t('blog.readMore')} →
                  </Link>
                </div>
              </article>
            </Card>
          )
        })}
      </div>
    </>
  )
}

const styles = {
  title: "mb-6 text-3xl font-bold text-slate-900 dark:text-slate-100",
  postsList: "space-y-6",
  
  // Post Card Styles
  postCard: "group block w-full transition-transform hover:-translate-y-1 hover:shadow-md",
  metaContainer: "mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400",
  dateContainer: "flex items-center gap-4",
  iconText: "flex items-center gap-1",
  updatedText: "flex items-center gap-1 text-slate-400",
  tagsContainer: "flex gap-2",
  tag: cn(
    "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium",
    "text-slate-600 dark:bg-slate-800 dark:text-slate-300"
  ),
  postTitle: cn(
    "mb-3 text-2xl font-bold transition-colors",
    "group-hover:text-blue-600 dark:group-hover:text-blue-400 text-slate-900 dark:text-slate-100"
  ),
  summary: "mb-4 text-slate-600 dark:text-slate-300",
  footer: "flex items-center justify-between",
  statsContainer: "flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500",
  readMore: "text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
}
