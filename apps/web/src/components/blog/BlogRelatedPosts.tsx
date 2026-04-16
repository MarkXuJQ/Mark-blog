import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { getImageUrl } from '../../utils/image'
import { cn } from '../../utils/cn'
import type { BlogPost, BlogPostSummary } from '../../types'

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

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    target.style.setProperty('--x-rotate', `${y * -16}deg`)
    target.style.setProperty('--y-rotate', `${x * 16}deg`)
  }

  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    target.style.setProperty('--x-rotate', '0deg')
    target.style.setProperty('--y-rotate', '0deg')
  }

  if (recommendations.length === 0) return null

  return (
    <aside className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>{t('blog.recommend.title')}</span>
      </div>
      <ul className={styles.list}>
        {recommendations.map((post) => {
          const hasImage = Boolean(post.image)
          return (
            <li key={post.id} className={styles.item}>
              <Link to={`/blog/${post.slug}`} className="block">
                <Card
                  className={cn(styles.card, hasImage && styles.cardWithImage)}
                  onMouseMove={hasImage ? handleMouseMove : undefined}
                  onMouseLeave={hasImage ? handleMouseLeave : undefined}
                >
                  {hasImage && post.image ? (
                    <>
                      <div className={styles.imageWrapper}>
                        <img
                          src={getImageUrl(post.image)}
                          alt={post.title}
                          className={styles.image}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className={styles.glassOverlay} aria-hidden="true" />
                    </>
                  ) : null}

                  <div className={styles.content}>
                    <h4 className={styles.postTitle}>{post.title}</h4>
                    <time className={styles.postMeta}>{post.date}</time>
                  </div>
                </Card>
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
  list: 'space-y-4',
  item: 'list-none',
  card: cn(
    'group relative flex min-h-[64px] h-[64px] w-full overflow-hidden border border-[var(--border-color)]',
    'bg-[var(--surface-card)] transition-all duration-200 ease-out',
    'has-[.line-clamp-3]:h-auto',
    'p-4',
    '[transform:rotateX(var(--x-rotate,0deg))_rotateY(var(--y-rotate,0deg))]',
    'shadow-[0_16px_24px_-20px_rgba(15,23,42,0.5)]',
    'hover:shadow-[0_10px_18px_-16px_rgba(15,23,42,0.45)]',
    'dark:shadow-[0_20px_32px_-24px_rgba(0,0,0,0.72)]',
    'dark:hover:shadow-[0_14px_24px_-20px_rgba(0,0,0,0.65)]',
    'hover:border-slate-300 dark:hover:border-slate-700',
    'will-change-transform,box-shadow'
  ),
  cardWithImage: cn(
    'h-[64px] min-h-[64px] p-0 bg-transparent border-transparent shadow-none'
  ),
  imageWrapper: cn(
    'absolute inset-0 z-0',
    '[mask-image:linear-gradient(70deg,transparent_10%,black_70%)]',
    '[-webkit-mask-image:linear-gradient(70deg,transparent_10%,black_70%)]'
  ),
  image:
    'absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105',
  glassOverlay: cn(
    'absolute inset-0 z-10 pointer-events-none',
    'backdrop-blur-[12px] bg-gradient-to-tr from-slate-200/50 via-slate-200/12 to-transparent',
    'dark:from-[#1f2328]/75 dark:via-[#2a313a]/40',
    '[mask-image:linear-gradient(70deg,black_40%,black_55%,transparent_90%)]',
    '[-webkit-mask-image:linear-gradient(70deg,black_40%,black_55%,transparent_90%)]'
  ),
  content: cn(
    'relative z-20 flex w-full flex-col justify-center py-2.5 pl-4 pr-[28%] text-left'
  ),
  postTitle: cn(
    'text-sm font-semibold tracking-tight text-slate-800/90 dark:text-slate-100/90 transition-colors',
    'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    'line-clamp-3 leading-snug',
    'blur-[0.2px] drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]',
    'dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
  ),
  postMeta:
    'mt-1 text-[10px] font-semibold text-slate-500/80 dark:text-slate-400/80 flex items-center gap-1 blur-[0.2px]',
}
