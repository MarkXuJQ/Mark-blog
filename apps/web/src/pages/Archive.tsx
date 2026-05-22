import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Layers, Calendar } from 'lucide-react'
import { Seo } from '@/components/seo/Seo'
import { getAllPostSummaries } from '@/lib/content'
import { cn } from '@/lib/utils'
import type { ArchiveOutletContext } from '@/layouts/ArchiveLayout'
import type { BlogPostSummary } from '@/types'

export function Archive() {
  const { t, i18n } = useTranslation()
  const { simpleMode = false } = useOutletContext<ArchiveOutletContext>()
  const posts = getAllPostSummaries(i18n.language)
  const dateLocale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'

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
    {} as Record<number, BlogPostSummary[]>
  )

  // Sort years descending
  const years = Object.keys(postsByYear)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className={simpleMode ? styles.simpleContainer : styles.container}>
      <Seo title={t('blog.sidebar.archive.title')} />
      {simpleMode ? (
        <SimpleArchive
          years={years}
          postsByYear={postsByYear}
          dateLocale={dateLocale}
        />
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <Layers className={styles.headerIcon} />
              <h1 className={styles.title}>
                {t('blog.sidebar.archive.title')}
              </h1>
            </div>
            <BackToBlogLink />
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
                            {new Date(post.date).toLocaleDateString(
                              dateLocale,
                              {
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </time>
                        </div>

                        <div className={styles.postHeader}>
                          <h3 className={styles.postTitle}>
                            <Link
                              to={`/blog/${post.slug}`}
                              className={styles.postLink}
                            >
                              <span
                                className="absolute inset-0"
                                aria-hidden="true"
                              />
                              {post.title}
                            </Link>
                          </h3>
                          {post.tags && post.tags.length > 0 && (
                            <div className="z-10 flex gap-2">
                              {post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SimpleArchive({
  years,
  postsByYear,
  dateLocale,
}: {
  years: number[]
  postsByYear: Record<number, BlogPostSummary[]>
  dateLocale: string
}) {
  const { t } = useTranslation()

  return (
    <>
      <header className={styles.simpleHeader}>
        <div className={styles.simpleHeaderTitleGroup}>
          <h1 className={styles.simpleTitle}>
            {t('blog.sidebar.archive.title')}
          </h1>
          <span className={styles.simpleCount}>
            {years.reduce(
              (count, year) => count + postsByYear[year].length,
              0
            )}{' '}
            {t('blog.sidebar.stats.articleCount')}
          </span>
        </div>
        <BackToBlogLink simple />
      </header>

      <div className={styles.simpleYearList}>
        {years.map((year) => (
          <section key={year} className={styles.simpleYearSection}>
            <div className={styles.simpleYearHeader}>
              <h2 className={styles.simpleYearTitle}>{year}</h2>
              <span className={styles.simpleYearCount}>
                {postsByYear[year].length}
              </span>
            </div>

            <div className={styles.simplePostsList}>
              {postsByYear[year].map((post) => (
                <article key={post.slug} className={styles.simplePostItem}>
                  <time dateTime={post.date} className={styles.simplePostDate}>
                    {new Date(post.date).toLocaleDateString(dateLocale, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  <Link to={`/blog/${post.slug}`} className={styles.simpleLink}>
                    {post.title}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

function BackToBlogLink({ simple = false }: { simple?: boolean }) {
  const { t } = useTranslation()

  return (
    <Link
      to="/blog"
      className={cn(styles.backLink, simple && styles.simpleBackLink)}
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{t('blog.back')}</span>
    </Link>
  )
}

const styles = {
  container: 'mx-auto max-w-3xl space-y-8 px-4 py-8',
  simpleContainer: 'mx-auto w-full max-w-3xl px-0 py-2',
  header:
    'flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800',
  headerTitleGroup: 'flex min-w-0 items-center gap-3',
  headerIcon: 'h-8 w-8 text-blue-500',
  title: 'text-3xl font-bold text-slate-900 dark:text-slate-100',
  backLink:
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',

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
  postHeader: 'flex flex-col justify-between gap-2 sm:flex-row sm:items-center',
  postTitle:
    'text-lg font-bold text-slate-800 transition-colors group-hover:text-blue-500 dark:text-slate-200 dark:group-hover:text-blue-400',
  postLink: 'focus:outline-none',

  simpleHeader:
    'mb-8 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-[var(--border-color)] pb-4',
  simpleHeaderTitleGroup: 'flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1',
  simpleTitle: 'text-3xl font-bold text-[var(--text-primary)]',
  simpleCount: 'text-sm font-medium text-[var(--text-secondary)]',
  simpleBackLink:
    'px-0 text-[var(--text-secondary)] hover:bg-transparent hover:text-[var(--text-primary)] dark:hover:bg-transparent',
  simpleYearList: 'space-y-10',
  simpleYearSection: 'space-y-4',
  simpleYearHeader: 'flex items-baseline gap-3',
  simpleYearTitle: 'text-2xl font-bold text-[var(--text-primary)]',
  simpleYearCount: 'text-sm font-medium text-[var(--text-secondary)]',
  simplePostsList: 'space-y-0',
  simplePostItem:
    'grid grid-cols-[5.25rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[6rem_minmax(0,1fr)]',
  simplePostDate:
    'pt-0.5 text-sm font-medium text-[var(--text-secondary)]',
  simpleLink:
    'text-[1.05rem] font-semibold leading-7 text-[var(--text-primary)] transition-colors hover:text-[color-mix(in_srgb,var(--brand-400)_72%,var(--text-primary)_28%)]',
}
