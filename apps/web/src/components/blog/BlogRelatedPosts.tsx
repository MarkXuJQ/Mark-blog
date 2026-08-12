import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getOptimizedImageUrl } from '@/lib/image'
import { cn } from '@/lib/classNames'
import type { BlogPost, BlogPostSummary } from '@/lib/content/posts'

interface BlogRelatedPostsProps {
  currentPost: BlogPost | null
  posts: BlogPostSummary[]
  maxItems?: number
}

export function BlogRelatedPosts({
  currentPost,
  posts,
  maxItems = 5,
}: BlogRelatedPostsProps) {
  const { t } = useTranslation()
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
      .slice(0, maxItems)
      .map((item) => item.post)
  }, [currentPost, posts, maxItems])

  if (recommendations.length === 0) return null

  return (
    <aside className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{t('blog.recommend.title')}</span>
        </div>
        <ul className={styles.list}>
          {recommendations.map((post, index) => {
            const hasImage = Boolean(post.image)
            return (
              <li key={post.id} className={styles.item}>
                {index > 0 ? (
                  <div className={styles.separator} aria-hidden="true" />
                ) : null}
                <Link to={`/blog/${post.slug}`} className={styles.link}>
                  <article className={styles.card}>
                    <div className={styles.media} aria-hidden="true">
                      {hasImage && post.image ? (
                        <>
                          <img
                            src={getOptimizedImageUrl(post.image, 'thumbnail')}
                            alt=""
                            className={styles.image}
                            loading="lazy"
                            decoding="async"
                          />
                          <span className={styles.imageOverlay} />
                        </>
                      ) : (
                        <DefaultRelatedPostCover index={index} />
                      )}
                    </div>

                    <div className={styles.content}>
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

function DefaultRelatedPostCover({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 160 112"
      aria-hidden="true"
      className={styles.fallbackCover}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient
          id={`related-cover-bg-${index}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor="var(--surface-card)" />
          <stop
            offset="100%"
            stopColor="color-mix(in srgb, var(--surface-card) 70%, var(--brand-500) 30%)"
          />
        </linearGradient>
      </defs>
      <rect
        width="160"
        height="112"
        rx="14"
        fill={`url(#related-cover-bg-${index})`}
      />
      <path
        d="M35 32h58c10 0 18 8 18 18v30H53c-10 0-18-8-18-18V32Z"
        fill="color-mix(in srgb, var(--brand-400) 18%, transparent)"
      />
      <path
        d="M50 46h48M50 58h38M50 70h28"
        fill="none"
        stroke="color-mix(in srgb, var(--text-primary) 34%, transparent)"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <text
        x="123"
        y="88"
        fill="color-mix(in srgb, var(--text-primary) 42%, transparent)"
        fontFamily="var(--font-code)"
        fontSize="18"
        fontWeight="700"
        textAnchor="middle"
      >
        {String(index + 1).padStart(2, '0')}
      </text>
    </svg>
  )
}

const styles = {
  wrapper: 'hidden lg:block',
  panel: cn(
    'overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80',
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
  card: cn(
    'relative grid grid-cols-[4.5rem_1fr] items-stretch overflow-hidden'
  ),
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
  fallbackCover:
    'absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105',
  content: cn('flex min-w-0 flex-col justify-center px-3.5 py-1.5 text-left'),
  postTitle: cn(
    'line-clamp-2 text-sm font-semibold leading-[1.3] text-[var(--text-primary)] transition-colors',
    'group-hover:text-[color-mix(in_srgb,var(--brand-600)_82%,var(--text-primary)_18%)]',
    'dark:group-hover:text-[color-mix(in_srgb,var(--brand-400)_82%,var(--text-primary)_18%)]'
  ),
  postMeta:
    'mt-1 text-[11px] font-medium leading-4 text-[var(--text-disabled)]',
}
