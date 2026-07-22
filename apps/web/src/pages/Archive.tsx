import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Layers, X } from 'lucide-react'
import { Seo } from '@/app/seo/Seo'
import { StaggeredList } from '@/components/ui/StaggeredList'
import { getAllPostSummaries } from '@/lib/content/postSummaries'
import { cn } from '@/lib/classNames'
import type { ArchiveOutletContext } from '@/layouts/ArchiveLayout'
import type { BlogPostSummary } from '@/lib/content/posts'

export function Archive() {
  const { t, i18n } = useTranslation()
  const { simpleMode = false } = useOutletContext<ArchiveOutletContext>()
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const posts = getAllPostSummaries(i18n.language)
  const postsByYear = groupPostsByYear(posts)
  const years = getArchiveYears(postsByYear)
  const filteredPosts =
    selectedTags.length > 0
      ? posts.filter((post) => postMatchesSelectedTags(post, selectedTags))
      : posts
  const filteredPostsByYear = groupPostsByYear(filteredPosts)
  const filteredYears = getArchiveYears(filteredPostsByYear)
  const hasSelectedTags = selectedTags.length > 0
  const filterMotionKey = selectedTags.map(getArchiveTagKey).join('|')

  const toggleTag = (tag: string) => {
    setSelectedTags((currentTags) => {
      const tagKey = getArchiveTagKey(tag)
      const isSelected = currentTags.some(
        (currentTag) => getArchiveTagKey(currentTag) === tagKey
      )

      if (isSelected) {
        return currentTags.filter(
          (currentTag) => getArchiveTagKey(currentTag) !== tagKey
        )
      }

      return [...currentTags, tag]
    })
  }

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

          {hasSelectedTags ? (
            <div className={styles.filterBar}>
              <div className={styles.filterContent}>
                <span className={styles.filterLabel}>
                  {t('blog.archive.activeTags')}
                </span>
                <div className={styles.selectedTags}>
                  {selectedTags.map((tag) => (
                    <SelectedArchiveTag
                      key={getArchiveTagKey(tag)}
                      tag={tag}
                      hoveredTag={hoveredTag}
                      onHoverTag={setHoveredTag}
                      onToggleTag={toggleTag}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={styles.clearTagsButton}
                onClick={() => {
                  setSelectedTags([])
                  setHoveredTag(null)
                }}
              >
                {t('blog.archive.clearTags')}
              </button>
            </div>
          ) : null}

          <div className={styles.yearList}>
            {filteredYears.map((year) => (
              <section key={year} className={styles.yearSection}>
                <div className={styles.yearHeader}>
                  <h2 className={styles.yearTitle}>
                    {year}
                    <span className={styles.postCount}>
                      {filteredPostsByYear[year].length}{' '}
                      {t('blog.sidebar.stats.articleCount')}
                    </span>
                  </h2>
                </div>

                <StaggeredList
                  key={`${year}-${filterMotionKey}`}
                  className={styles.postsList}
                >
                  {filteredPostsByYear[year].map((post) => (
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
                            <ArchivePostTag
                              key={tag}
                              tag={tag}
                              hoveredTag={hoveredTag}
                              selectedTags={selectedTags}
                              onHoverTag={setHoveredTag}
                              onToggleTag={toggleTag}
                            />
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </StaggeredList>
              </section>
            ))}

            {filteredYears.length === 0 ? (
              <div className={styles.emptyState}>
                {t('blog.archive.noTagResults')}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

function ArchivePostTag({
  tag,
  hoveredTag,
  selectedTags,
  onHoverTag,
  onToggleTag,
}: {
  tag: string
  hoveredTag: string | null
  selectedTags: string[]
  onHoverTag: (tag: string | null) => void
  onToggleTag: (tag: string) => void
}) {
  const { t } = useTranslation()
  const tagKey = getArchiveTagKey(tag)
  const isSelected = selectedTags.some(
    (selectedTag) => getArchiveTagKey(selectedTag) === tagKey
  )
  const isHovered = getArchiveTagKey(hoveredTag) === tagKey

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={t('blog.archive.filterByTag', { tag })}
      className={cn(
        styles.postTag,
        (isSelected || isHovered) && styles.postTagActive
      )}
      onClick={(event) => {
        event.stopPropagation()
        onToggleTag(tag)
      }}
      onMouseEnter={() => onHoverTag(tag)}
      onMouseLeave={() => onHoverTag(null)}
      onFocus={() => onHoverTag(tag)}
      onBlur={() => onHoverTag(null)}
    >
      #{tag}
    </button>
  )
}

function SelectedArchiveTag({
  tag,
  hoveredTag,
  onHoverTag,
  onToggleTag,
}: {
  tag: string
  hoveredTag: string | null
  onHoverTag: (tag: string | null) => void
  onToggleTag: (tag: string) => void
}) {
  const { t } = useTranslation()
  const isHovered = getArchiveTagKey(hoveredTag) === getArchiveTagKey(tag)

  return (
    <button
      type="button"
      aria-label={t('blog.archive.removeTag', { tag })}
      className={cn(styles.selectedTag, isHovered && styles.selectedTagActive)}
      onClick={() => onToggleTag(tag)}
      onMouseEnter={() => onHoverTag(tag)}
      onMouseLeave={() => onHoverTag(null)}
      onFocus={() => onHoverTag(tag)}
      onBlur={() => onHoverTag(null)}
    >
      <span>#{tag}</span>
      <X aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
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

function groupPostsByYear(posts: BlogPostSummary[]) {
  return posts.reduce(
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
}

function getArchiveYears(postsByYear: Record<number, BlogPostSummary[]>) {
  return Object.keys(postsByYear)
    .map(Number)
    .sort((a, b) => b - a)
}

function getArchiveTagKey(tag?: string | null) {
  return tag?.trim().toLowerCase() ?? ''
}

function postMatchesSelectedTags(
  post: BlogPostSummary,
  selectedTags: string[]
) {
  return selectedTags.every((selectedTag) =>
    post.tags?.some(
      (postTag) => getArchiveTagKey(postTag) === getArchiveTagKey(selectedTag)
    )
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
  filterBar:
    'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur dark:border-0 dark:bg-[#17191c] dark:shadow-none',
  filterContent: 'flex min-w-0 flex-1 flex-wrap items-center gap-2.5',
  filterLabel:
    'text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500',
  selectedTags: 'flex min-w-0 flex-wrap items-center gap-2',
  selectedTag:
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition-[background-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-slate-900 hover:text-white hover:ring-slate-900/20 hover:shadow-[0_10px_22px_-16px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/70 dark:hover:bg-slate-100 dark:hover:text-slate-950 dark:hover:ring-white/20 dark:hover:shadow-none',
  selectedTagActive:
    '-translate-y-0.5 bg-slate-900 text-white ring-slate-900/20 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.55)] dark:bg-slate-100 dark:text-slate-950 dark:ring-white/20 dark:shadow-none',
  clearTagsButton:
    'inline-flex shrink-0 cursor-pointer items-center rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',

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
    'min-w-0 text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400',
  postLink: 'focus:outline-none',
  postTags: 'relative z-10 mt-2 flex shrink-0 flex-wrap gap-2 sm:mt-0',
  postTag:
    'relative z-10 inline-flex cursor-pointer items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 transition-[background-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-slate-900 hover:text-white hover:shadow-[0_10px_22px_-16px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-100 dark:hover:text-slate-950 dark:hover:shadow-none',
  postTagActive:
    '-translate-y-0.5 bg-slate-900 text-white shadow-[0_0_0_1px_rgba(15,23,42,0.12),0_10px_22px_-16px_rgba(15,23,42,0.55)] dark:bg-slate-100 dark:text-slate-950 dark:shadow-none',
  emptyState:
    'rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400',

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
