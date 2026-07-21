import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion, type MotionValue, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getAllPostSummaries } from '@/lib/content/postSummaries'
import { CategoryLabel } from '@/components/blog/CategoryLabel'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/classNames'
import type { BlogPostSummary } from '@/lib/content/posts'

interface HomeBlogRailSectionProps {
  avatarSrc: string
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionPointerEvents?: MotionValue<string>
}

const BLOG_POST_LIMIT = 7
const BLOG_RAIL_DEFAULT_SPEED_PERCENT = 50
const BLOG_RAIL_MIN_SPEED_PERCENT = 20
const BLOG_RAIL_MAX_SPEED_PERCENT = 100
const BLOG_RAIL_BASE_DURATION_SECONDS = 64
const BLOG_RAIL_DRAG_CLICK_THRESHOLD = 6
const HOME_PAGER_SUPPRESS_EVENT = 'home:pager-suppress'

interface BlogRailDragState {
  pointerId: number
  startX: number
  startY: number
  startOffset: number
  hasDragged: boolean
}

function normalizeRailOffset(offset: number, loopWidth: number) {
  if (loopWidth <= 0) return 0

  const positiveOffset = ((offset % loopWidth) + loopWidth) % loopWidth
  return positiveOffset === 0 ? 0 : positiveOffset - loopWidth
}

function suppressHomePager(durationMs = 900) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(HOME_PAGER_SUPPRESS_EVENT, {
      detail: { durationMs },
    })
  )
}

export function HomeBlogRailSection({
  avatarSrc,
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionPointerEvents,
}: HomeBlogRailSectionProps) {
  const { t, i18n } = useTranslation()
  const shouldReduceMotion = Boolean(useReducedMotion())
  const railTrackRef = useRef<HTMLDivElement | null>(null)
  const railOffsetRef = useRef(0)
  const railLoopWidthRef = useRef(0)
  const railLastFrameTimeRef = useRef<number | null>(null)
  const railDragStateRef = useRef<BlogRailDragState | null>(null)
  const suppressClickRef = useRef(false)
  const [isDraggingRail, setIsDraggingRail] = useState(false)
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
    if (!railTrackNode) return

    let frameId = 0
    let resizeFrameId = 0

    const applyRailOffset = () => {
      railTrackNode.style.transform = `translate3d(${railOffsetRef.current}px, 0, 0)`
    }

    const syncLoopWidth = () => {
      window.cancelAnimationFrame(resizeFrameId)
      resizeFrameId = window.requestAnimationFrame(() => {
        const loopWidth = railTrackNode.scrollWidth / 2
        railLoopWidthRef.current = loopWidth
        railOffsetRef.current = normalizeRailOffset(
          railOffsetRef.current,
          loopWidth
        )
        applyRailOffset()
      })
    }

    const tick = (timestamp: number) => {
      const previousTimestamp = railLastFrameTimeRef.current
      railLastFrameTimeRef.current = timestamp

      if (
        previousTimestamp != null &&
        !shouldReduceMotion &&
        !railDragStateRef.current
      ) {
        const loopWidth = railLoopWidthRef.current
        const speedMultiplier = speedPercent / BLOG_RAIL_DEFAULT_SPEED_PERCENT
        const distancePerMs =
          loopWidth / (BLOG_RAIL_BASE_DURATION_SECONDS * 1000)
        const deltaMs = timestamp - previousTimestamp

        railOffsetRef.current = normalizeRailOffset(
          railOffsetRef.current - distancePerMs * speedMultiplier * deltaMs,
          loopWidth
        )
        applyRailOffset()
      }

      frameId = window.requestAnimationFrame(tick)
    }

    let startTimer = 0

    const startLoop = () => {
      syncLoopWidth()
      frameId = window.requestAnimationFrame(tick)
    }

    startTimer = window.setTimeout(startLoop, 180)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(syncLoopWidth)

    resizeObserver?.observe(railTrackNode)
    window.addEventListener('load', syncLoopWidth)

    return () => {
      window.clearTimeout(startTimer)
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(resizeFrameId)
      resizeObserver?.disconnect()
      window.removeEventListener('load', syncLoopWidth)
    }
  }, [shouldReduceMotion, speedPercent])

  const handleRailPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    railDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: railOffsetRef.current,
      hasDragged: false,
    }
    railLastFrameTimeRef.current = null
    suppressHomePager()
  }

  const handleRailPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = railDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaX = event.clientX - dragState.startX
    const deltaY = event.clientY - dragState.startY
    const loopWidth = railLoopWidthRef.current

    if (
      !dragState.hasDragged &&
      (Math.hypot(deltaX, deltaY) < BLOG_RAIL_DRAG_CLICK_THRESHOLD ||
        Math.abs(deltaX) <= Math.abs(deltaY))
    ) {
      return
    }

    if (!dragState.hasDragged) {
      dragState.hasDragged = true
      suppressClickRef.current = true
      setIsDraggingRail(true)
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      suppressHomePager()
    }

    railOffsetRef.current = normalizeRailOffset(
      dragState.startOffset + deltaX,
      loopWidth
    )

    if (railTrackRef.current) {
      railTrackRef.current.style.transform = `translate3d(${railOffsetRef.current}px, 0, 0)`
    }

    event.preventDefault()
    suppressHomePager()
  }

  const finishRailDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = railDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    if (dragState.hasDragged) {
      suppressClickRef.current = true
      suppressHomePager()
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 160)
    }

    railDragStateRef.current = null
    railLastFrameTimeRef.current = null
    setIsDraggingRail(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleRailClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

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

                <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                  {headerStats.map((stat) => (
                    <div
                      key={stat.label}
                      data-home-reveal="blog-stat"
                      data-home-reveal-index={headerStats.indexOf(stat)}
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
            <div className="relative w-full">
              <div
                data-home-no-pager="true"
                className={cn(
                  'relative cursor-grab touch-pan-y overflow-hidden select-none',
                  isDraggingRail && 'cursor-grabbing'
                )}
                onClickCapture={handleRailClickCapture}
                onDragStart={(event) => event.preventDefault()}
                onPointerCancel={finishRailDrag}
                onPointerDown={handleRailPointerDown}
                onPointerMove={handleRailPointerMove}
                onPointerUp={finishRailDrag}
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

                <div
                  ref={railTrackRef}
                  className="flex w-max items-stretch will-change-transform"
                >
                  <BlogRailSegment
                    posts={posts}
                    dateFormatter={dateFormatter}
                  />
                  <BlogRailSegment
                    posts={posts}
                    dateFormatter={dateFormatter}
                    ariaHidden
                  />
                </div>
              </div>

              <BlogRailSpeedControl
                isZh={isZh}
                speedPercent={speedPercent}
                onValueChange={setScrollSpeed}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function BlogRailSpeedControl({
  isZh,
  speedPercent,
  onValueChange,
}: {
  isZh: boolean
  speedPercent: number
  onValueChange: (value: number[]) => void
}) {
  const label = isZh ? '滚动速度' : 'Scroll Speed'
  const percentLabel = `${speedPercent}%`

  return (
    <div
      data-home-no-pager="true"
      data-home-reveal="blog-control"
      data-home-reveal-delay={0.2}
      className="pointer-events-auto absolute right-8 -bottom-10 z-30 w-[min(13rem,calc(100vw-4rem))] sm:right-10 sm:w-56"
    >
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
      <input
        id="home-blog-scroll-speed"
        type="range"
        value={speedPercent}
        min={BLOG_RAIL_MIN_SPEED_PERCENT}
        max={BLOG_RAIL_MAX_SPEED_PERCENT}
        step={5}
        aria-label={label}
        className="home-blog-speed-slider"
        style={
          {
            '--home-blog-speed-progress': `${
              ((speedPercent - BLOG_RAIL_MIN_SPEED_PERCENT) /
                (BLOG_RAIL_MAX_SPEED_PERCENT - BLOG_RAIL_MIN_SPEED_PERCENT)) *
              100
            }%`,
          } as CSSProperties
        }
        onChange={(event) => onValueChange([Number(event.currentTarget.value)])}
      />
    </div>
  )
}

interface BlogRailSegmentProps {
  posts: BlogPostSummary[]
  dateFormatter: Intl.DateTimeFormat
  ariaHidden?: boolean
}

function BlogRailSegment({
  posts,
  dateFormatter,
  ariaHidden,
}: BlogRailSegmentProps) {
  return (
    <div className="flex shrink-0 pl-4 sm:pl-6 lg:pl-8">
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
  const itemNumber = String(index + 1).padStart(2, '0')
  const isFeatured = index === 0

  return (
    <Link
      to={`/blog/${post.slug}`}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-hidden={ariaHidden}
      data-home-reveal={ariaHidden ? undefined : 'blog-card'}
      data-home-reveal-index={ariaHidden ? undefined : index}
      className={cn(
        'group relative flex min-h-[19rem] shrink-0 flex-col justify-between overflow-hidden border border-slate-200/70 px-5 py-5 transition-[background-color,box-shadow,transform] duration-300 sm:min-h-[21rem] sm:px-7 sm:py-6 lg:min-h-[22rem] lg:px-8 dark:border-0',
        isFeatured
          ? 'w-[20.5rem] bg-black/[0.03] shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] hover:shadow-[0_28px_54px_-42px_rgba(15,23,42,0.42)] sm:w-[28rem] lg:w-[32rem] dark:bg-white/[0.04] dark:shadow-none dark:hover:shadow-[0_28px_56px_-44px_rgba(2,6,23,0.86)]'
          : 'w-[18.5rem] shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] sm:w-[24rem] lg:w-[28rem] dark:shadow-none'
      )}
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
          {post.category ? (
            <CategoryLabel
              category={post.category}
              className="text-[0.66rem] tracking-[0.16em] uppercase"
              iconClassName="h-3.5 w-3.5"
            />
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
