import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Layers } from 'lucide-react'
import { Seo } from '@/components/seo/Seo'
import { StaggeredList } from '@/components/ui/StaggeredList'
import { getAllPostSummaries } from '@/lib/content'
import { cn } from '@/lib/utils'
import type { ArchiveOutletContext } from '@/layouts/ArchiveLayout'
import type { BlogPostSummary } from '@/types'

export function Archive() {
  const { t, i18n } = useTranslation()
  const { simpleMode = false } = useOutletContext<ArchiveOutletContext>()
  const posts = getAllPostSummaries(i18n.language)

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
        <SimpleArchive years={years} postsByYear={postsByYear} />
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

          <div className={styles.yearList}>
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

                <StaggeredList className={styles.postsList}>
                  {postsByYear[year].map((post) => (
                    <article key={post.slug} className={styles.postItem}>
                      <div className={styles.postHeader}>
                        <time dateTime={post.date} className={styles.postDate}>
                          {formatArchiveDate(post.date)}
                        </time>
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
                      </div>

                      {post.tags && post.tags.length > 0 && (
                        <div className={styles.postTags}>
                          {post.tags.map((tag) => (
                            <span key={tag} className={styles.postTag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </StaggeredList>
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
}: {
  years: number[]
  postsByYear: Record<number, BlogPostSummary[]>
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
            {years.reduce((count, year) => count + postsByYear[year].length, 0)}{' '}
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

            <StaggeredList className={styles.simplePostsList}>
              {postsByYear[year].map((post) => (
                <article key={post.slug} className={styles.simplePostItem}>
                  <time dateTime={post.date} className={styles.simplePostDate}>
                    {formatArchiveDate(post.date)}
                  </time>
                  <Link to={`/blog/${post.slug}`} className={styles.simpleLink}>
                    {post.title}
                  </Link>
                </article>
              ))}
            </StaggeredList>
          </section>
        ))}
      </div>
    </>
  )
}

function formatArchiveDate(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date

  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${month}/${day}`
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
  container: 'mx-auto w-full max-w-4xl space-y-8 px-0 py-8',
  simpleContainer: 'mx-auto w-full max-w-4xl px-0 py-2',
  header:
    'flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800',
  headerTitleGroup: 'flex min-w-0 items-center gap-3',
  headerIcon: 'h-8 w-8 text-blue-500',
  title: 'text-3xl font-bold text-slate-900 dark:text-slate-100',
  backLink:
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',

  yearList: 'space-y-9',

  yearSection: 'animate-fade-in-up',
  yearHeader: 'mb-6 flex items-center',
  yearTitle:
    'flex items-baseline gap-4 text-4xl font-black text-slate-200 dark:text-slate-700',
  postCount: 'text-sm font-normal text-slate-500',

  postsList: 'space-y-0',

  postItem:
    'group relative py-4 first:pt-0 last:pb-0 sm:flex sm:items-baseline sm:justify-between sm:gap-4',
  postHeader: 'flex min-w-0 items-baseline gap-3',
  postDate:
    'shrink-0 font-mono text-sm font-medium tabular-nums text-slate-400 dark:text-slate-500',
  postTitle:
    'min-w-0 text-lg font-bold text-slate-800 transition-colors group-hover:text-blue-500 dark:text-slate-200 dark:group-hover:text-blue-400',
  postLink: 'focus:outline-none',
  postTags: 'relative z-10 mt-2 flex shrink-0 flex-wrap gap-2 sm:mt-0',
  postTag:
    'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400',

  simpleHeader:
    'mb-8 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 border-b border-[var(--border-color)] pb-4',
  simpleHeaderTitleGroup:
    'flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1',
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
    'grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[4.75rem_minmax(0,1fr)]',
  simplePostDate: 'pt-0.5 text-sm font-medium text-[var(--text-secondary)]',
  simpleLink:
    'text-[1.05rem] font-semibold leading-7 text-[var(--text-primary)] transition-colors hover:text-[color-mix(in_srgb,var(--brand-400)_72%,var(--text-primary)_28%)]',
}
