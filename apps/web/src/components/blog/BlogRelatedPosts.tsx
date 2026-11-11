import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getOptimizedImageUrl } from '@/lib/image'
import { cn } from '@/lib/classNames'
import type { BlogPost, BlogPostSummary } from '@/lib/content/posts'
import { useSidebarItemLimit } from '@/hooks/blog/useSidebarItemLimit'

interface BlogRelatedPostsProps {
  currentPost: BlogPost | null
  posts: BlogPostSummary[]
  maxItems?: number
}

export function BlogRelatedPosts({
  currentPost,
  posts,
  maxItems = 3,
}: BlogRelatedPostsProps) {
  const { t } = useTranslation()
  const visibleItemLimit = useSidebarItemLimit({ maxItems })
  const recommendations = useMemo(() => {
    if (!currentPost?.category) return []
    const currentTags = new Set(
      (currentPost.tags ?? []).map((tag) => tag.toLowerCase())
    )

    return posts
      .filter(
        (post) =>
          post.slug !== currentPost.slug &&
          post.category === currentPost.category
      )
      .map((post) => {
        const overlap = (post.tags ?? []).reduce((count, tag) => {
          return currentTags.has(tag.toLowerCase()) ? count + 1 : count
        }, 0)
        return { post, overlap }
      })
      .sort((a, b) => {
        if (b.overlap !== a.overlap) return b.overlap - a.overlap
        return new Date(b.post.date).getTime() - new Date(a.post.date).getTime()
      })
      .slice(0, visibleItemLimit)
      .map((item) => item.post)
  }, [currentPost, posts, visibleItemLimit])

  if (recommendations.length === 0) return null

  return (
    <aside className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('blog.recommend.title')}</span>
        </div>
        <ul className={styles.list}>
          {recommendations.map((post, index) => {
            const cover = post.image
            return (
              <li key={post.id} className={styles.item}>
                {index > 0 ? (
                  <div className={styles.separator} aria-hidden="true" />
                ) : null}
                <Link to={`/blog/${post.slug}`} className={styles.link}>
                  <article
                    className={cn(
                      styles.card,
                      cover ? styles.cardWithCover : styles.cardPlain
                    )}
                  >
                    {cover ? (
                      <div className={styles.media} aria-hidden="true">
                        <img
                          src={getOptimizedImageUrl(cover, 'thumbnail')}
                          alt=""
                          className={styles.image}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className={styles.imageOverlay} />
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        styles.content,
                        !cover && 'px-0.5 py-0.5'
                      )}
                    >
                      <h4 className={styles.postTitle}>{post.title}</h4>
                      <time className={styles.postMeta}>{post.date}</time>
                    </div>
                  </article>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

const styles = {
  wrapper: 'hidden lg:block',
  panel: cn(
    'overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 pb-1',
    'shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur-sm',
    'dark:border-0 dark:bg-[#17191c] dark:shadow-none'
  ),
  header:
    'flex items-center px-4 pb-2.5 pt-3 text-sm font-semibold text-[var(--text-secondary)]',
  title: 'tracking-[0.02em]',
  list: 'm-0',
  item: 'list-none',
  separator:
    'mx-[15%] border-t border-slate-200/70 dark:border-[color-mix(in_srgb,var(--border-color)_80%,transparent)]',
  link: cn(
    'group block px-3.5 py-2 focus:outline-none focus-visible:ring-2',
    'focus-visible:ring-[var(--brand-400)] focus-visible:ring-inset',
    'transition-colors hover:bg-slate-50/80 dark:hover:bg-[#1b2026]'
  ),
  card: cn('relative items-stretch overflow-hidden'),
  // The sidebar is only 260px wide at lg and 288px at xl, so the cover column
  // grows modestly with the available width without squeezing the title.
  cardWithCover: cn('grid grid-cols-[5rem_1fr]', 'xl:grid-cols-[6rem_1fr]'),
  // Posts without a cover get a plain text-only row: no placeholder art.
  cardPlain: 'block',
  media: cn(
    'relative flex aspect-[3/2] h-auto w-full self-center overflow-hidden rounded-lg',
    'bg-slate-100/80',
    'dark:bg-[#141210]'
  ),
  image:
    'absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
  imageOverlay: cn(
    'absolute inset-0',
    'bg-gradient-to-br from-black/24 via-black/6 to-black/34',
    'dark:from-black/36 dark:via-black/12 dark:to-black/48'
  ),
  content: cn('flex min-w-0 flex-col justify-center px-3 py-1.5 text-left'),
  postTitle: cn(
    'line-clamp-2 text-sm font-semibold leading-[1.3] text-[var(--text-primary)] transition-colors',
    'group-hover:text-[color-mix(in_srgb,var(--brand-600)_82%,var(--text-primary)_18%)]',
    'dark:group-hover:text-[color-mix(in_srgb,var(--brand-400)_82%,var(--text-primary)_18%)]'
  ),
  postMeta:
    'mt-1 text-[11px] font-medium leading-4 text-[var(--text-disabled)]',
}
