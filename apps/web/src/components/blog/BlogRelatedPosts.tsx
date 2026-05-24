import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getOptimizedImageUrl } from '@/utils/image'
import { cn } from '@/lib/utils'
import type { BlogPost, BlogPostSummary } from '@/types'

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
      <div className={styles.header}>
        <span className={styles.title}>{t('blog.recommend.title')}</span>
      </div>
      <ul className={styles.list}>
        {recommendations.map((post, index) => {
          const hasImage = Boolean(post.image)
          return (
            <li key={post.id} className={styles.item}>
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
                      <span className={styles.fallbackMark}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
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
    </aside>
  )
}

const styles = {
  wrapper: 'hidden lg:block',
  header:
    'mb-3 flex items-center justify-between text-sm font-semibold text-[var(--text-secondary)]',
  title: 'tracking-[0.02em]',
  list: 'space-y-2.5',
  item: 'list-none',
  link: 'group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-background)]',
  card: cn(
    'relative grid min-h-[74px] grid-cols-[4.25rem_1fr] items-stretch overflow-hidden rounded-xl',
    'border border-slate-200/70 bg-white/80',
    'shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur-sm',
    'transition-[background-color,box-shadow,transform] duration-200 ease-out',
    'group-hover:-translate-y-0.5 group-hover:bg-white/90',
    'group-hover:shadow-[0_18px_34px_-26px_rgba(15,23,42,0.55)]',
    'dark:border-0 dark:bg-[#17191c] dark:shadow-none dark:group-hover:bg-[#1c1a18]'
  ),
  media: cn(
    'relative m-2 mr-0 flex min-h-[58px] overflow-hidden rounded-lg',
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
  fallbackMark: cn(
    'relative z-10 m-auto font-[var(--font-code)] text-[0.72rem] font-semibold',
    'text-[color-mix(in_srgb,var(--text-primary)_62%,var(--brand-600)_38%)]',
    'dark:text-[color-mix(in_srgb,var(--text-primary)_72%,var(--brand-400)_28%)]'
  ),
  content: cn('flex min-w-0 flex-col justify-center px-3 py-2.5 text-left'),
  postTitle: cn(
    'line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition-colors',
    'group-hover:text-[color-mix(in_srgb,var(--brand-600)_82%,var(--text-primary)_18%)]',
    'dark:group-hover:text-[color-mix(in_srgb,var(--brand-400)_82%,var(--text-primary)_18%)]'
  ),
  postMeta: 'mt-1.5 text-[10px] font-medium text-[var(--text-disabled)]',
}
