import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  motion,
  type MotionValue,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { getAllPosts } from '../../utils/posts'
import type { BlogPost } from '../../types'

interface HomeBlogRailSectionProps {
  avatarSrc: string
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionFilter?: MotionValue<string>
  sectionPointerEvents?: MotionValue<string>
}

const BLOG_POST_LIMIT = 7
const BLOG_HOLD_END = 0.24
const BLOG_AUTO_SCROLL_SPEED_MULTIPLIER = 2
const BLOG_ENTRY_SPEED = 12.5
const BLOG_IDLE_SPEED = 25.5
const BLOG_WHEEL_BOOST_MAX = 76
const BLOG_WHEEL_BOOST_DECAY_PER_MS = 0.02
const BLOG_WHEEL_BOOST_RESPONSE_MS = 88
const BLOG_WHEEL_BOOST_INTENSITY = 5
const BLOG_WHEEL_REVERSE_INTENSITY = 3.35
const BLOG_WHEEL_IMPULSE_MULTIPLIER = 3
const BLOG_WHEEL_CRUISE_MAX = 8.5
const BLOG_WHEEL_CRUISE_DECAY_PER_MS = 0.0024
const BLOG_WHEEL_REVERSE_IMPULSE_SCALE = 0.38
const BLOG_WHEEL_REVERSE_CRUISE_SCALE = 0.66
const BLOG_SCROLL_DIRECTION_DECAY_PER_MS = 0.0034
const BLOG_SCROLL_RETURN_BASE_SPEED_SCALE = 0.5
const BLOG_SCROLL_RETURN_RAMP_MS = 520
const BLOG_SCROLL_RETURN_RELEASE_MS = 240
const BLOG_SCROLL_RETURN_BRAKE_PORTION = 0.62
const BLOG_REQUIRED_LOOP_PASSES = 2
const BLOG_SCENE_LEAD_IN_PX = 960
const BLOG_SCENE_MIN_EXTRA_SCROLL_PX = 3000
const BLOG_SCROLL_DISTANCE_SCALE = 2 / 3

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function approachValue(value: number, target: number, maxDelta: number) {
  if (value < target) return Math.min(target, value + maxDelta)
  if (value > target) return Math.max(target, value - maxDelta)
  return value
}

function clampMagnitude(value: number, maxMagnitude: number) {
  return Math.min(maxMagnitude, Math.max(-maxMagnitude, value))
}

function getScrollImpulse(delta: number) {
  const direction = Math.sign(delta) || 1
  const magnitude = Math.min(240, Math.abs(delta))
  return direction * (
    Math.min(18.5, 2.4 + Math.pow(magnitude, 0.78) * 0.26) *
    BLOG_WHEEL_IMPULSE_MULTIPLIER
  )
}

function getScrollCruiseBoost(delta: number) {
  const direction = Math.sign(delta) || 1
  const magnitude = Math.min(240, Math.abs(delta))
  return direction * Math.min(7.2, 2.6 + Math.pow(magnitude, 0.58) * 0.16)
}

function wrapLoopOffset(value: number, loopWidth: number) {
  if (loopWidth <= 0) return value

  const wrapped = value % loopWidth
  return wrapped > 0 ? wrapped - loopWidth : wrapped
}

function isBlogSceneActive(progress: number) {
  return progress > 0.01 && progress < 0.995
}

export function HomeBlogRailSection({
  avatarSrc,
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionFilter,
  sectionPointerEvents,
}: HomeBlogRailSectionProps) {
  const { i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const segmentRef = useRef<HTMLDivElement | null>(null)
  const wheelBoostTargetRef = useRef(0)
  const wheelBoostCurrentRef = useRef(0)
  const wheelCruiseBoostRef = useRef(0)
  const scrollDirectionTargetRef = useRef(0)
  const scrollDirectionCurrentRef = useRef(0)
  const returnBlendRef = useRef(0)
  const [segmentWidth, setSegmentWidth] = useState(0)
  const x = useMotionValue(0)

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const posts = useMemo(
    () => getAllPosts(i18n.language).slice(0, BLOG_POST_LIMIT),
    [i18n.language]
  )
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  )
  const sceneMinHeight = useMemo(() => {
    if (prefersReducedMotion) return '100svh'

    const baseExtraScrollDistance = Math.max(
      BLOG_SCENE_MIN_EXTRA_SCROLL_PX,
      segmentWidth * BLOG_REQUIRED_LOOP_PASSES + BLOG_SCENE_LEAD_IN_PX
    )
    const extraScrollDistance =
      baseExtraScrollDistance * BLOG_SCROLL_DISTANCE_SCALE

    return `calc(100svh + ${Math.round(extraScrollDistance)}px)`
  }, [prefersReducedMotion, segmentWidth])

  useEffect(() => {
    const segmentNode = segmentRef.current
    if (!segmentNode) return

    const updateMeasurements = () => {
      setSegmentWidth(segmentNode.scrollWidth)
    }

    updateMeasurements()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMeasurements)
      return () => window.removeEventListener('resize', updateMeasurements)
    }

    const observer = new ResizeObserver(updateMeasurements)
    observer.observe(segmentNode)

    return () => observer.disconnect()
  }, [posts])

  const { scrollY } = useScroll()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const progress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 260 : 120,
    damping: prefersReducedMotion ? 34 : 22,
    mass: 0.38,
  })

  useEffect(() => {
    x.set(0)
    wheelBoostTargetRef.current = 0
    wheelBoostCurrentRef.current = 0
    wheelCruiseBoostRef.current = 0
    scrollDirectionTargetRef.current = 0
    scrollDirectionCurrentRef.current = 0
    returnBlendRef.current = 0
  }, [posts, segmentWidth, x])

  useEffect(() => {
    if (prefersReducedMotion) return

    let previousScrollY = scrollY.get()

    const unsubscribe = scrollY.on('change', (latest) => {
      const delta = latest - previousScrollY
      previousScrollY = latest

      if (delta === 0) return

      const sectionProgress = progress.get()
      if (!isBlogSceneActive(sectionProgress)) return

      const normalizedDelta = clampMagnitude(delta, 240)
      const isReverseInput = normalizedDelta < 0
      const impulse =
        getScrollImpulse(normalizedDelta) *
        (isReverseInput ? BLOG_WHEEL_REVERSE_IMPULSE_SCALE : 1)
      const cruiseBoost =
        getScrollCruiseBoost(normalizedDelta) *
        (isReverseInput ? BLOG_WHEEL_REVERSE_CRUISE_SCALE : 1)
      scrollDirectionTargetRef.current = isReverseInput ? -1 : 1

      wheelCruiseBoostRef.current = Math.min(
        BLOG_WHEEL_CRUISE_MAX,
        Math.max(-BLOG_WHEEL_CRUISE_MAX, wheelCruiseBoostRef.current + cruiseBoost)
      )
      wheelBoostTargetRef.current = Math.min(
        BLOG_WHEEL_BOOST_MAX,
        Math.max(-BLOG_WHEEL_BOOST_MAX, wheelBoostTargetRef.current + impulse)
      )
    })

    return unsubscribe
  }, [prefersReducedMotion, progress, scrollY])

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || segmentWidth <= 0) return

    const sectionProgress = progress.get()
    const isActive = isBlogSceneActive(sectionProgress)
    const responseFactor = 1 - Math.exp(-delta / BLOG_WHEEL_BOOST_RESPONSE_MS)

    if (!isActive) {
      wheelCruiseBoostRef.current = approachValue(
        wheelCruiseBoostRef.current,
        0,
        delta * BLOG_WHEEL_CRUISE_DECAY_PER_MS
      )
      wheelBoostTargetRef.current = approachValue(
        wheelBoostTargetRef.current,
        0,
        delta * BLOG_WHEEL_BOOST_DECAY_PER_MS
      )
      scrollDirectionTargetRef.current = approachValue(
        scrollDirectionTargetRef.current,
        0,
        delta * BLOG_SCROLL_DIRECTION_DECAY_PER_MS
      )
      scrollDirectionCurrentRef.current +=
        (scrollDirectionTargetRef.current - scrollDirectionCurrentRef.current) *
        responseFactor
      const returnBlendTarget = 0
      const returnBlendResponse = 1 - Math.exp(
        -delta / BLOG_SCROLL_RETURN_RELEASE_MS
      )
      returnBlendRef.current +=
        (returnBlendTarget - returnBlendRef.current) * returnBlendResponse
      wheelBoostCurrentRef.current +=
        (wheelBoostTargetRef.current - wheelBoostCurrentRef.current) *
        responseFactor
      return
    }

    const holdProgress = clamp01(sectionProgress / BLOG_HOLD_END)
    const easedHoldProgress = easeOutCubic(holdProgress)
    const baseSpeed =
      (BLOG_ENTRY_SPEED +
        (BLOG_IDLE_SPEED - BLOG_ENTRY_SPEED) * easedHoldProgress) *
      BLOG_AUTO_SCROLL_SPEED_MULTIPLIER

    wheelCruiseBoostRef.current = approachValue(
      wheelCruiseBoostRef.current,
      0,
      delta * BLOG_WHEEL_CRUISE_DECAY_PER_MS
    )
    wheelBoostTargetRef.current = approachValue(
      wheelBoostTargetRef.current,
      wheelCruiseBoostRef.current,
      delta * BLOG_WHEEL_BOOST_DECAY_PER_MS
    )
    scrollDirectionTargetRef.current = approachValue(
      scrollDirectionTargetRef.current,
      0,
      delta * BLOG_SCROLL_DIRECTION_DECAY_PER_MS
    )
    scrollDirectionCurrentRef.current +=
      (scrollDirectionTargetRef.current - scrollDirectionCurrentRef.current) *
      responseFactor
    const returnBlendTarget = clamp01(-scrollDirectionCurrentRef.current)
    const returnBlendResponse = 1 - Math.exp(
      -delta /
        (returnBlendTarget > returnBlendRef.current
          ? BLOG_SCROLL_RETURN_RAMP_MS
          : BLOG_SCROLL_RETURN_RELEASE_MS)
    )
    returnBlendRef.current +=
      (returnBlendTarget - returnBlendRef.current) * returnBlendResponse
    wheelBoostCurrentRef.current +=
      (wheelBoostTargetRef.current - wheelBoostCurrentRef.current) *
      responseFactor

    const brakeProgress = clamp01(
      returnBlendRef.current / BLOG_SCROLL_RETURN_BRAKE_PORTION
    )
    const returnProgress = clamp01(
      (returnBlendRef.current - BLOG_SCROLL_RETURN_BRAKE_PORTION) /
        (1 - BLOG_SCROLL_RETURN_BRAKE_PORTION)
    )
    const forwardBaseSpeed = baseSpeed * (1 - brakeProgress)
    const reverseBaseSpeed =
      baseSpeed * BLOG_SCROLL_RETURN_BASE_SPEED_SCALE * returnProgress
    const directionalBaseSpeed = forwardBaseSpeed - reverseBaseSpeed
    const rawSpeed =
      directionalBaseSpeed +
      wheelBoostCurrentRef.current *
        (wheelBoostCurrentRef.current >= 0
          ? BLOG_WHEEL_BOOST_INTENSITY
          : BLOG_WHEEL_REVERSE_INTENSITY)
    const speed = Math.max(rawSpeed, -reverseBaseSpeed)
    const distance = (delta / 1000) * speed
    const next = x.get() - distance

    x.set(wrapLoopOffset(next, segmentWidth))
  })

  const railY = useTransform(progress, (value) => {
    if (prefersReducedMotion) return 0
    if (value <= 0.16) return 28 + ((12 - 28) * value) / 0.16
    if (value <= 0.32) return 12 + ((0 - 12) * (value - 0.16)) / 0.16
    return 0
  })
  const railOpacity = useTransform(progress, (value) => {
    if (prefersReducedMotion) return 1
    if (value <= 0.1) return 0.82 + ((0.92 - 0.82) * value) / 0.1
    if (value <= 0.22) return 0.92 + ((1 - 0.92) * (value - 0.1)) / 0.12
    return 1
  })

  if (posts.length === 0) return null

  return (
    <section
      ref={sectionRef}
      aria-label={locale === 'zh-CN' ? '首页博客流' : 'Homepage blog rail'}
      className="relative z-10 isolate"
      style={{ minHeight: sceneMinHeight }}
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
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <h2 className="text-[1.95rem] leading-none font-medium tracking-[0.08em] text-[var(--text-primary)] sm:text-[2.2rem] lg:text-[2.6rem]">
                {locale === 'zh-CN' ? '本站博客' : 'Site Blog'}
              </h2>
              <div
                className="h-10 w-10 overflow-hidden rounded-full border shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)] sm:h-11 sm:w-11"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <img
                  src={avatarSrc}
                  alt={locale === 'zh-CN' ? 'Mark 的头像' : 'Portrait of Mark'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <motion.div
              className={cn(
                'relative w-full',
                prefersReducedMotion
                  ? 'scrollbar-hide overflow-x-auto'
                  : 'overflow-hidden'
              )}
              style={{ y: railY, opacity: railOpacity }}
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

              <motion.div className="flex w-max items-stretch" style={{ x }}>
                <BlogRailSegment
                  ref={segmentRef}
                  posts={posts}
                  dateFormatter={dateFormatter}
                />
                {prefersReducedMotion ? null : (
                  <BlogRailSegment
                    posts={posts}
                    dateFormatter={dateFormatter}
                    ariaHidden
                  />
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

interface BlogRailSegmentProps {
  posts: BlogPost[]
  dateFormatter: Intl.DateTimeFormat
  ariaHidden?: boolean
}

const BlogRailSegment = forwardRef<HTMLDivElement, BlogRailSegmentProps>(
  function BlogRailSegment({ posts, dateFormatter, ariaHidden }, ref) {
    return (
      <div ref={ref} className="flex shrink-0 pl-4 sm:pl-6 lg:pl-8">
        {posts.map((post) => (
          <BlogRailItem
            key={`${ariaHidden ? 'ghost' : 'live'}-${post.slug}`}
            post={post}
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
  dateFormatter,
  ariaHidden,
}: {
  post: BlogPost
  dateFormatter: Intl.DateTimeFormat
  ariaHidden?: boolean
}) {
  const formattedDate = dateFormatter.format(new Date(post.date))

  return (
    <Link
      to={`/blog/${post.slug}`}
      tabIndex={ariaHidden ? -1 : undefined}
      aria-hidden={ariaHidden}
      className={cn(
        'group flex min-h-[19rem] w-[18.5rem] shrink-0 flex-col justify-between px-5 py-5 transition-colors duration-300 sm:min-h-[21rem] sm:w-[24rem] sm:px-7 sm:py-6 lg:min-h-[22rem] lg:w-[28rem] lg:px-8',
        'hover:bg-black/[0.025] focus-visible:bg-black/[0.025] dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]'
      )}
      style={{ borderLeft: '1px solid var(--border-color)' }}
    >
      <div className="text-[0.7rem] tracking-[0.24em] text-[var(--text-secondary)] uppercase sm:text-[0.74rem]">
        {formattedDate}
      </div>

      <div className="space-y-4">
        <h2 className="text-[1.6rem] leading-[1.04] text-balance text-[var(--text-primary)] transition-transform duration-300 group-hover:translate-x-1 sm:text-[2rem] lg:text-[2.35rem]">
          {post.title}
        </h2>
        <p className="line-clamp-4 max-w-[26ch] text-sm leading-6 text-[var(--text-secondary)] sm:text-[0.95rem]">
          {post.summary}
        </p>
      </div>

      <div className="flex items-center justify-end text-[1.35rem] leading-none text-[var(--text-secondary)] transition-transform duration-300 group-hover:translate-x-1">
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  )
}
