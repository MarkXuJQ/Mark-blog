import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { motion, type MotionValue, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { cn } from '../../utils/cn'
import { getAllPostSummaries } from '../../utils/postSummaries'
import type { BlogPostSummary } from '../../types'

interface HomeBlogRailSectionProps {
  avatarSrc: string
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionFilter?: MotionValue<string>
  sectionPointerEvents?: MotionValue<string>
}

const BLOG_POST_LIMIT = 7
const BLOG_RAIL_DEFAULT_SPEED_PERCENT = 100
const BLOG_RAIL_MIN_SPEED_PERCENT = 50
const BLOG_RAIL_MAX_SPEED_PERCENT = 180

const styles = {
  autoRailTrack:
    '[animation:home-blog-rail-marquee_54s_linear_infinite] [@media(prefers-reduced-motion:reduce)]:[animation:none]',
}

export function HomeBlogRailSection({
  avatarSrc,
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionFilter,
  sectionPointerEvents,
}: HomeBlogRailSectionProps) {
  const { t, i18n } = useTranslation()
  const shouldReduceMotion = Boolean(useReducedMotion())
  const railTrackRef = useRef<HTMLDivElement | null>(null)
  const [scrollSpeed, setScrollSpeed] = useState([
    BLOG_RAIL_DEFAULT_SPEED_PERCENT,
  ])

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const isZh = locale === 'zh-CN'
  const speedPercent = scrollSpeed[0] ?? BLOG_RAIL_DEFAULT_SPEED_PERCENT
  const allPosts = useMemo(
    () => getAllPostSummaries(i18n.language),
    [i18n.language]
  )
  const posts = useMemo(() => allPosts.slice(0, BLOG_POST_LIMIT), [allPosts])
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  )
  const headerStats = useMemo(() => {
    const latestPost = allPosts[0]
    const latestDate = latestPost
      ? dateFormatter.format(new Date(latestPost.updated ?? latestPost.date))
      : null

    return [
      {
        label: t('blog.sidebar.stats.articleCount'),
        value: String(allPosts.length).padStart(2, '0'),
      },
      latestDate
        ? {
            label: t('blog.sidebar.stats.lastUpdate'),
            value: latestDate,
          }
        : null,
    ].filter((item): item is { label: string; value: string } => item != null)
  }, [allPosts, dateFormatter, t])

  useEffect(() => {
    const railTrackNode = railTrackRef.current
    if (!railTrackNode || shouldReduceMotion) return

    let frameId = 0

    const syncPlaybackRate = () => {
      const playbackRate = speedPercent / BLOG_RAIL_DEFAULT_SPEED_PERCENT
      railTrackNode.getAnimations().forEach((animation) => {
        animation.updatePlaybackRate(playbackRate)
      })
    }

    syncPlaybackRate()
    frameId = requestAnimationFrame(syncPlaybackRate)

    return () => cancelAnimationFrame(frameId)
  }, [shouldReduceMotion, speedPercent])

  if (posts.length === 0) return null

  return (
    <section
      aria-label={locale === 'zh-CN' ? '首页博客流' : 'Homepage blog rail'}
      className="relative isolate z-10"
      style={{ minHeight: '100svh' }}
    >
      <motion.div
        className="sticky top-0 h-[100svh] overflow-hidden"
        style={{
          scale: sectionScale,
          y: sectionY,
          opacity: sectionOpacity,
          filter: sectionFilter,
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
                <div className="space-y-3">
                  <div className="h-px w-14 bg-black/12 dark:bg-white/16" />
                  <div className="flex items-center gap-4">
                    <h2 className="heading-display text-[1.95rem] leading-none font-medium tracking-[0.08em] text-black/88 sm:text-[2.2rem] lg:text-[2.6rem] dark:text-white/90">
                      {locale === 'zh-CN' ? '本站博客' : 'Site Blog'}
                    </h2>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none h-10 w-10 shrink-0 overflow-hidden rounded-full border shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)] sm:h-11 sm:w-11"
                      style={{ borderColor: 'var(--border-color)' }}
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

                <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                  {headerStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="inline-flex min-h-11 items-baseline gap-2.5 text-left"
                    >
                      <span className="text-[0.68rem] font-semibold tracking-[0.22em] text-black/34 uppercase dark:text-white/34">
                        {stat.label}
                      </span>
                      <span className="text-sm font-medium text-black/74 dark:text-white/74">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                aria-hidden="true"
                className="h-px w-full bg-black/8 dark:bg-white/10"
              />
            </div>
            <motion.div className="relative w-full" style={{ opacity: 1 }}>
              <div className="relative overflow-hidden">
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

                <motion.div
                  ref={railTrackRef}
                  className={cn(
                    'flex w-max items-stretch',
                    !shouldReduceMotion && styles.autoRailTrack
                  )}
                >
                  <BlogRailSegment
                    posts={posts}
                    dateFormatter={dateFormatter}
                  />
                  {shouldReduceMotion ? null : (
                    <BlogRailSegment
                      posts={posts}
                      dateFormatter={dateFormatter}
                      ariaHidden
                    />
                  )}
                </motion.div>
              </div>

              <BlogRailSpeedControl
                isZh={isZh}
                value={scrollSpeed}
                speedPercent={speedPercent}
                onValueChange={setScrollSpeed}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function BlogRailSpeedControl({
  isZh,
  value,
  speedPercent,
  onValueChange,
}: {
  isZh: boolean
  value: number[]
  speedPercent: number
  onValueChange: (value: number[]) => void
}) {
  const label = isZh ? '滚动速度' : 'Scroll Speed'
  const percentLabel = `${speedPercent}%`

  return (
    <div className="pointer-events-auto absolute right-8 -bottom-10 z-30 w-[min(13rem,calc(100vw-4rem))] sm:right-10 sm:w-56">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label
          htmlFor="home-blog-scroll-speed"
          className="text-[0.58rem] tracking-[0.2em] text-black/54 uppercase dark:text-white/58"
        >
          {label}
        </Label>
        <output className="text-xs font-medium text-black/76 tabular-nums dark:text-white/78">
          {percentLabel}
        </output>
      </div>
      <Slider
        id="home-blog-scroll-speed"
        value={value}
        min={BLOG_RAIL_MIN_SPEED_PERCENT}
        max={BLOG_RAIL_MAX_SPEED_PERCENT}
        step={5}
        aria-label={label}
        onValueChange={onValueChange}
      />
    </div>
  )
}

interface BlogRailSegmentProps {
  posts: BlogPostSummary[]
  dateFormatter: Intl.DateTimeFormat
  ariaHidden?: boolean
}

const BlogRailSegment = forwardRef<HTMLDivElement, BlogRailSegmentProps>(
  function BlogRailSegment({ posts, dateFormatter, ariaHidden }, ref) {
    return (
      <div ref={ref} className="flex shrink-0 pl-4 sm:pl-6 lg:pl-8">
        {posts.map((post, index) => (
          <BlogRailItem
            key={`${ariaHidden ? 'ghost' : 'live'}-${post.slug}`}
            post={post}
            index={index}
            dateFormatter={dateFormatter}
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
)

function BlogRailItem({
  post,
  index,
  dateFormatter,
  ariaHidden,
}: {
  post: BlogPostSummary
  index: number
  dateFormatter: Intl.DateTimeFormat
  ariaHidden?: boolean
}) {
  const { t } = useTranslation()
  const formattedDate = dateFormatter.format(new Date(post.date))
  const categoryLabel = post.category
    ? t(`blog.categories.${post.category}`, post.category)
    : null
  const itemNumber = String(index + 1).padStart(2, '0')
  const isFeatured = index === 0

  return (
    <Link
      to={`/blog/${post.slug}`}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-hidden={ariaHidden}
      className={cn(
        'group relative flex min-h-[19rem] shrink-0 flex-col justify-between overflow-hidden px-5 py-5 transition-[background-color,transform] duration-300 sm:min-h-[21rem] sm:px-7 sm:py-6 lg:min-h-[22rem] lg:px-8',
        isFeatured
          ? 'w-[20.5rem] bg-black/[0.03] shadow-[0_28px_54px_-42px_rgba(15,23,42,0.42)] sm:w-[28rem] lg:w-[32rem] dark:bg-white/[0.04] dark:shadow-[0_28px_56px_-44px_rgba(2,6,23,0.86)]'
          : 'w-[18.5rem] sm:w-[24rem] lg:w-[28rem]'
      )}
      style={{ borderLeft: '1px solid var(--border-color)' }}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-0 right-5 left-5 h-px opacity-0 transition-opacity duration-300 sm:right-7 sm:left-7 lg:right-8 lg:left-8',
          isFeatured && 'opacity-100'
        )}
        style={{ backgroundColor: 'var(--text-primary)' }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="text-[0.7rem] tracking-[0.24em] text-[var(--text-secondary)] uppercase sm:text-[0.74rem]">
            {formattedDate}
          </div>
          {categoryLabel ? (
            <div className="inline-flex items-center text-[0.66rem] font-medium tracking-[0.16em] text-black/34 uppercase dark:text-white/34">
              {categoryLabel}
            </div>
          ) : null}
        </div>

        <div className="pt-0.5 text-[0.7rem] font-medium tracking-[0.22em] text-[var(--text-secondary)] uppercase">
          {itemNumber}
        </div>
      </div>

      <div className={cn('space-y-4', isFeatured && 'space-y-5')}>
        <h2
          className={cn(
            'text-balance text-black/88 dark:text-white/90',
            isFeatured
              ? 'text-[1.85rem] leading-[0.98] sm:text-[2.35rem] lg:text-[2.8rem]'
              : 'text-[1.6rem] leading-[1.04] sm:text-[2rem] lg:text-[2.35rem]'
          )}
        >
          {post.title}
        </h2>
        <p
          className={cn(
            'text-black/46 dark:text-white/48',
            isFeatured
              ? 'line-clamp-5 max-w-[30ch] text-[0.96rem] leading-7'
              : 'line-clamp-4 max-w-[26ch] text-sm leading-6 sm:text-[0.95rem]'
          )}
        >
          {post.summary}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 text-[var(--text-secondary)]">
        <span className="text-[0.68rem] tracking-[0.18em] uppercase">
          {t('blog.readMore')}
        </span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  )
}
