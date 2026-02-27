import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Layers, Calendar } from 'lucide-react'
import { getAllPosts } from '../utils/posts'
import { cn } from '../utils/cn'
import type { BlogPost } from '../types'

export function Archive() {
  const { t } = useTranslation()
  const posts = getAllPosts()

  // Group posts by year
  const postsByYear = posts.reduce(
    (acc, post) => {
      const year = new Date(post.date).getFullYear()
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(post)
      return acc
    },
    {} as Record<number, BlogPost[]>
  )

  // Sort years descending
  const years = Object.keys(postsByYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Layers className={styles.headerIcon} />
        <h1 className={styles.title}>{t('blog.sidebar.archive.title')}</h1>
      </div>

      <div className={styles.timelineWrapper}>
        {years.map((year) => (
          <section key={year} className={styles.yearSection}>
            <div className={styles.yearHeader}>
              <h2 className={styles.yearTitle}>
                {year}
                <span className={styles.postCount}>
                  {postsByYear[year].length}{' '}
                  {t('blog.sidebar.stats.articleCount')}
                </span>
              </h2>
            </div>

            <div className={styles.postsList}>
              {postsByYear[year].map((post) => (
                <div key={post.slug} className={styles.postItem}>
                  {/* Timeline Dot */}
                  <div className={styles.timelineDot} />

                  <article className={styles.postContent}>
                    <div className={styles.postMeta}>
                      <Calendar size={14} />
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    </div>

                    <h3 className={styles.postTitle}>
                      <Link
                        to={`/blog/${post.slug}`}
                        className={styles.postLink}
                      >
                        <span className="absolute inset-0" aria-hidden="true" />
                        {post.title}
                      </Link>
                    </h3>
                  </article>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: 'mx-auto max-w-3xl space-y-8 px-4 py-8',
  header:
    'flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800',
  headerIcon: 'h-8 w-8 text-blue-500',
  title: 'text-3xl font-bold text-slate-900 dark:text-slate-100',

  timelineWrapper: 'space-y-8',

  yearSection: 'animate-fade-in-up',
  yearHeader: 'mb-6 flex items-center',
  yearTitle:
    'flex items-baseline gap-4 text-4xl font-black text-slate-200 dark:text-slate-700',
  postCount: 'text-sm font-normal text-slate-500',

  postsList:
    'relative ml-4 space-y-8 border-l-2 border-slate-100 py-2 dark:border-slate-800',

  postItem: 'relative pl-8',
  timelineDot: cn(
    'absolute top-1 -left-[9px] h-4 w-4 rounded-full border-2',
    'border-white bg-blue-500 dark:border-slate-900 dark:bg-blue-600'
  ),

  postContent: 'group relative flex flex-col gap-1',
  postMeta:
    'flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400',
  postTitle:
    'text-lg font-bold text-slate-800 transition-colors group-hover:text-blue-500 dark:text-slate-200 dark:group-hover:text-blue-400',
  postLink: 'focus:outline-none',
}
