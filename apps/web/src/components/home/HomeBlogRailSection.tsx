import { useMemo } from 'react'
import { motion, type MotionValue, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getAllPostSummaries } from '@/lib/content/postSummaries'
import { cn } from '@/lib/classNames'
import { getOptimizedImageUrl } from '@/lib/image'
import { CategoryLabel } from '@/components/blog/CategoryLabel'
import type { BlogPostSummary } from '@/lib/content/posts'

interface HomeBlogRailSectionProps {
  avatarSrc: string
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionPointerEvents?: MotionValue<string>
}

const BLOG_POST_LIMIT = 7
export function HomeBlogRailSection({
  avatarSrc,
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionPointerEvents,
}: HomeBlogRailSectionProps) {
  const { i18n } = useTranslation()
  const shouldReduceMotion = Boolean(useReducedMotion())

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const allPosts = useMemo(
    () => getAllPostSummaries(i18n.language),
    [i18n.language]
  )
  const posts = useMemo(() => {
    const selectedPosts = allPosts.filter((post) => post.selected)
    return (selectedPosts.length > 0 ? selectedPosts : allPosts).slice(
      0,
      BLOG_POST_LIMIT
    )
  }, [allPosts])
  if (posts.length === 0) return null

  return (
    <section
      data-home-snap="blog"
      aria-label={locale === 'zh-CN' ? '首页博客流' : 'Homepage blog rail'}
      className="relative isolate z-10 h-[100vh] snap-start snap-always"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <motion.div
        className="sticky top-0 h-[100vh] overflow-hidden"
        style={{
          scale: sectionScale,
          y: sectionY,
          opacity: sectionOpacity,
          pointerEvents: sectionPointerEvents,
        }}
      >
        <div
          className="relative h-full overflow-hidden"
          style={{ backgroundColor: 'var(--page-background)' }}
        >
          <div className="relative flex h-full flex-col justify-center gap-16 py-12 sm:py-14">
            <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div data-home-reveal="blog-header" className="space-y-3">
                  <div className="h-px w-14 bg-black/12 dark:bg-white/16" />
                  <div className="flex items-center gap-4">
                    <h2 className="heading-display text-[1.95rem] leading-none font-medium tracking-[0.08em] text-black/88 sm:text-[2.2rem] lg:text-[2.6rem] dark:text-white/90">
                      {locale === 'zh-CN' ? '本站博客' : 'Site Blog'}
                    </h2>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)] sm:h-11 sm:w-11"
                    >
                      <img
                        src={avatarSrc}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="h-px w-full bg-black/8 dark:bg-white/10"
              />
            </div>
            <div className="relative w-full">
              <div
                data-home-no-pager="true"
                className="relative overflow-hidden"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 sm:w-16 lg:w-24"
                  style={{
                    background:
                      'linear-gradient(90deg, var(--page-background) 0%, transparent 100%)',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 sm:w-16 lg:w-24"
                  style={{
                    background:
                      'linear-gradient(270deg, var(--page-background) 0%, transparent 100%)',
                  }}
                />

                <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
                  <BlogRailRow
                    posts={posts}
                    reverse={false}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                  <BlogRailRow
                    posts={posts}
                    reverse
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

interface BlogRailSegmentProps {
  posts: BlogPostSummary[]
  ariaHidden?: boolean
}

function BlogRailRow({
  posts,
  reverse,
  shouldReduceMotion,
}: {
  posts: BlogPostSummary[]
  reverse: boolean
  shouldReduceMotion: boolean
}) {
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          'flex w-max items-stretch',
          !shouldReduceMotion &&
            (reverse ? 'home-blog-marquee-reverse' : 'home-blog-marquee')
        )}
      >
        <BlogRailSegment posts={posts} />
        <BlogRailSegment posts={posts} ariaHidden />
      </div>
    </div>
  )
}

function BlogRailSegment({ posts, ariaHidden }: BlogRailSegmentProps) {
  return (
    <div className="flex shrink-0 gap-3 pl-4 sm:gap-4 sm:pl-6 lg:gap-5 lg:pl-8">
      {posts.map((post, index) => (
        <BlogRailItem
          key={`${ariaHidden ? 'ghost' : 'live'}-${post.slug}`}
          post={post}
          index={index}
          ariaHidden={ariaHidden}
        />
      ))}
      <div
        aria-hidden="true"
        className="my-5 w-px shrink-0 sm:my-6"
        style={{ backgroundColor: 'var(--border-color)' }}
      />
    </div>
  )
}

function BlogRailItem({
  post,
  index,
  ariaHidden,
}: {
  post: BlogPostSummary
  index: number
  ariaHidden?: boolean
}) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-hidden={ariaHidden}
      data-home-reveal={ariaHidden ? undefined : 'blog-card'}
      data-home-reveal-index={ariaHidden ? undefined : index}
      className="group relative flex h-28 w-[78vw] shrink-0 items-end overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 px-5 py-4 text-white shadow-[0_20px_55px_-36px_rgba(15,23,42,0.8)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_26px_65px_-36px_rgba(15,23,42,0.9)] sm:h-32 sm:w-[22rem] sm:px-6 lg:w-[26rem] dark:border-white/10"
    >
      {post.image ? (
        <img
          src={getOptimizedImageUrl(post.image, 'card')}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10"
      />
      <div className="relative z-10 min-w-0">
        <h2 className="truncate text-[1.05rem] leading-tight text-white sm:text-[1.2rem]">
          {post.title}
        </h2>
        {post.category ? (
          <CategoryLabel
            category={post.category}
            className="mt-2 text-[0.62rem] tracking-[0.16em] text-white/70 uppercase"
            iconClassName="h-3 w-3"
          />
        ) : null}
      </div>
    </Link>
  )
}
