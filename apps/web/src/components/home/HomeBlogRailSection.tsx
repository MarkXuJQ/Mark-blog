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
const BLOG_HOLD_END = 0.24
const BLOG_AUTO_SCROLL_SPEED_MULTIPLIER = 6.5
const BLOG_ENTRY_SPEED = 12.5
const BLOG_IDLE_SPEED = 25.5
const BLOG_WHEEL_BOOST_MAX = 168
const BLOG_WHEEL_BOOST_DECAY_PER_MS = 0.016
const BLOG_WHEEL_BOOST_RESPONSE_MS = 72
const BLOG_WHEEL_BOOST_INTENSITY = 3.9
const BLOG_WHEEL_REVERSE_INTENSITY = 2.7
const BLOG_WHEEL_IMPULSE_MULTIPLIER = 4
const BLOG_WHEEL_CRUISE_MAX = 18
const BLOG_WHEEL_CRUISE_DECAY_PER_MS = 0.002
const BLOG_WHEEL_FRICTION_FULL_MS = 260
const BLOG_WHEEL_FRICTION_BOOST_DECAY_MULTIPLIER = 5.4
const BLOG_WHEEL_FRICTION_BOOST_PEAK_MULTIPLIER = 2.1
const BLOG_WHEEL_FRICTION_CRUISE_DECAY_MULTIPLIER = 3.6
const BLOG_WHEEL_FRICTION_CRUISE_PEAK_MULTIPLIER = 1.4
const BLOG_WHEEL_FRICTION_CURRENT_PULL_PER_MS = 0.16
const BLOG_WHEEL_FRICTION_CURRENT_PULL_PEAK_PER_MS = 0.2
const BLOG_WHEEL_DELTA_MAX = 440
const BLOG_WHEEL_LINE_HEIGHT_PX = 18
const BLOG_WHEEL_PAGE_HEIGHT_FALLBACK_PX = 900
const BLOG_WHEEL_SAMPLE_MIN_MS = 12
const BLOG_WHEEL_SAMPLE_MAX_MS = 220
const BLOG_WHEEL_GESTURE_RESET_MS = 220
const BLOG_WHEEL_VELOCITY_FLOOR = 0.18
const BLOG_WHEEL_VELOCITY_RANGE = 2.25
const BLOG_WHEEL_ACCELERATION_RANGE = 0.92
const BLOG_WHEEL_VELOCITY_GAIN = 0.68
const BLOG_WHEEL_ACCELERATION_GAIN = 0.98
const BLOG_WHEEL_CADENCE_GAIN = 0.28
const BLOG_WHEEL_MAGNITUDE_GAIN = 0.24
const BLOG_WHEEL_ACCELERATION_GAIN_MAX = 3.15
const BLOG_WHEEL_DIRECTION_CHANGE_ACCELERATION_SCALE = 0.66
const BLOG_WHEEL_REVERSE_IMPULSE_SCALE = 0.48
const BLOG_WHEEL_REVERSE_CRUISE_SCALE = 0.78
const BLOG_WHEEL_REVERSE_ACCELERATION_SCALE = 0.92
const BLOG_SCROLL_DIRECTION_DECAY_PER_MS = 0.0034
const BLOG_SCROLL_RETURN_BASE_SPEED_SCALE = 0.5
const BLOG_SCROLL_RETURN_RAMP_MS = 520
const BLOG_SCROLL_RETURN_RELEASE_MS = 240
const BLOG_SCROLL_RETURN_BRAKE_PORTION = 0.62
const BLOG_REQUIRED_LOOP_PASSES = 2
const BLOG_SCENE_LEAD_IN_PX = 960
const BLOG_SCENE_MIN_EXTRA_SCROLL_PX = 3000
const BLOG_SCROLL_DISTANCE_SCALE = 2 / 3
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function getWheelFrictionProgress(idleTimeMs: number) {
  return clamp01(idleTimeMs / BLOG_WHEEL_FRICTION_FULL_MS)
}

function approachValue(value: number, target: number, maxDelta: number) {
  if (value < target) return Math.min(target, value + maxDelta)
  if (value > target) return Math.max(target, value - maxDelta)
  return value
}

function clampMagnitude(value: number, maxMagnitude: number) {
  return Math.min(maxMagnitude, Math.max(-maxMagnitude, value))
}

function normalizeWheelDelta(deltaY: number, deltaMode: number) {
  const scale =
    deltaMode === DOM_DELTA_LINE
      ? BLOG_WHEEL_LINE_HEIGHT_PX
      : deltaMode === DOM_DELTA_PAGE
        ? typeof window === 'undefined'
          ? BLOG_WHEEL_PAGE_HEIGHT_FALLBACK_PX
          : window.innerHeight || BLOG_WHEEL_PAGE_HEIGHT_FALLBACK_PX
        : 1

  return clampMagnitude(deltaY * scale, BLOG_WHEEL_DELTA_MAX)
}

function getScrollImpulse(delta: number) {
  const direction = Math.sign(delta) || 1
  const magnitude = Math.min(360, Math.abs(delta))
  return (
    direction *
    (Math.min(24.5, 2.8 + Math.pow(magnitude, 0.8) * 0.29) *
      BLOG_WHEEL_IMPULSE_MULTIPLIER)
  )
}

function getScrollCruiseBoost(delta: number) {
  const direction = Math.sign(delta) || 1
  const magnitude = Math.min(360, Math.abs(delta))
  return direction * Math.min(11.8, 2.9 + Math.pow(magnitude, 0.62) * 0.22)
}

function getWheelBurstGain({
  normalizedDelta,
  deltaTimeMs,
  previousVelocity,
  sameDirection,
}: {
  normalizedDelta: number
  deltaTimeMs: number
  previousVelocity: number
  sameDirection: boolean
}) {
  const sampleMs = clamp(
    deltaTimeMs,
    BLOG_WHEEL_SAMPLE_MIN_MS,
    BLOG_WHEEL_SAMPLE_MAX_MS
  )
  const magnitude = Math.abs(normalizedDelta)
  const velocity = magnitude / sampleMs
  const velocityProgress = easeOutCubic(
    clamp01((velocity - BLOG_WHEEL_VELOCITY_FLOOR) / BLOG_WHEEL_VELOCITY_RANGE)
  )
  const magnitudeProgress = easeOutCubic(
    clamp01(magnitude / BLOG_WHEEL_DELTA_MAX)
  )
  const acceleration = sameDirection
    ? Math.max(0, velocity - previousVelocity)
    : velocity * BLOG_WHEEL_DIRECTION_CHANGE_ACCELERATION_SCALE
  const accelerationProgress = easeOutCubic(
    clamp01(acceleration / BLOG_WHEEL_ACCELERATION_RANGE)
  )
  const cadenceProgress = easeOutCubic(
    clamp01(
      (BLOG_WHEEL_GESTURE_RESET_MS - sampleMs) /
        Math.max(1, BLOG_WHEEL_GESTURE_RESET_MS - BLOG_WHEEL_SAMPLE_MIN_MS)
    )
  )

  return {
    gain: Math.min(
      BLOG_WHEEL_ACCELERATION_GAIN_MAX,
      1 +
        magnitudeProgress * BLOG_WHEEL_MAGNITUDE_GAIN +
        velocityProgress * BLOG_WHEEL_VELOCITY_GAIN +
        accelerationProgress * BLOG_WHEEL_ACCELERATION_GAIN +
        cadenceProgress * BLOG_WHEEL_CADENCE_GAIN
    ),
    velocity,
  }
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
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const segmentRef = useRef<HTMLDivElement | null>(null)
  const wheelBoostTargetRef = useRef(0)
  const wheelBoostCurrentRef = useRef(0)
  const wheelCruiseBoostRef = useRef(0)
  const scrollDirectionTargetRef = useRef(0)
  const scrollDirectionCurrentRef = useRef(0)
  const returnBlendRef = useRef(0)
  const lastWheelEventTimeRef = useRef(0)
  const lastWheelVelocityRef = useRef(0)
  const lastWheelDirectionRef = useRef(0)
  const [segmentWidth, setSegmentWidth] = useState(0)
  const x = useMotionValue(0)

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
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
    lastWheelEventTimeRef.current = 0
    lastWheelVelocityRef.current = 0
    lastWheelDirectionRef.current = 0
  }, [posts, segmentWidth, x])

  useEffect(() => {
    if (prefersReducedMotion) return

    const resetWheelGesture = () => {
      lastWheelEventTimeRef.current = 0
      lastWheelVelocityRef.current = 0
      lastWheelDirectionRef.current = 0
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

      const sectionProgress = progress.get()
      if (!isBlogSceneActive(sectionProgress)) {
        resetWheelGesture()
        return
      }

      const normalizedDelta = normalizeWheelDelta(event.deltaY, event.deltaMode)
      if (Math.abs(normalizedDelta) < 0.01) return

      const isReverseInput = normalizedDelta < 0
      const direction = Math.sign(normalizedDelta) || 1
      const timestamp = event.timeStamp || performance.now()
      const previousTimestamp = lastWheelEventTimeRef.current
      const deltaTimeMs =
        previousTimestamp > 0
          ? timestamp - previousTimestamp
          : BLOG_WHEEL_GESTURE_RESET_MS
      const sameDirection =
        direction === lastWheelDirectionRef.current &&
        deltaTimeMs <= BLOG_WHEEL_GESTURE_RESET_MS
      const { gain, velocity } = getWheelBurstGain({
        normalizedDelta,
        deltaTimeMs,
        previousVelocity: sameDirection ? lastWheelVelocityRef.current : 0,
        sameDirection,
      })
      const effectiveGain = isReverseInput
        ? 1 + (gain - 1) * BLOG_WHEEL_REVERSE_ACCELERATION_SCALE
        : gain
      const impulse =
        getScrollImpulse(normalizedDelta) *
        effectiveGain *
        (isReverseInput ? BLOG_WHEEL_REVERSE_IMPULSE_SCALE : 1)
      const cruiseBoost =
        getScrollCruiseBoost(normalizedDelta) *
        effectiveGain *
        (isReverseInput ? BLOG_WHEEL_REVERSE_CRUISE_SCALE : 1)

      lastWheelEventTimeRef.current = timestamp
      lastWheelVelocityRef.current = velocity
      lastWheelDirectionRef.current = direction
      scrollDirectionTargetRef.current = isReverseInput ? -1 : 1

      wheelCruiseBoostRef.current = clampMagnitude(
        wheelCruiseBoostRef.current + cruiseBoost,
        BLOG_WHEEL_CRUISE_MAX
      )
      wheelBoostTargetRef.current = clampMagnitude(
        wheelBoostTargetRef.current + impulse,
        BLOG_WHEEL_BOOST_MAX
      )
    }

    window.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      resetWheelGesture()
      window.removeEventListener('wheel', onWheel)
    }
  }, [prefersReducedMotion, progress])

  useAnimationFrame((time, delta) => {
    if (prefersReducedMotion || segmentWidth <= 0) return

    const sectionProgress = progress.get()
    const isActive = isBlogSceneActive(sectionProgress)
    const responseFactor = 1 - Math.exp(-delta / BLOG_WHEEL_BOOST_RESPONSE_MS)
    const idleTimeMs =
      lastWheelEventTimeRef.current > 0
        ? Math.max(0, time - lastWheelEventTimeRef.current)
        : BLOG_WHEEL_GESTURE_RESET_MS
    const frictionProgress = getWheelFrictionProgress(idleTimeMs)
    const positiveBoostRatio = clamp01(
      Math.max(0, wheelBoostCurrentRef.current) / BLOG_WHEEL_BOOST_MAX
    )
    const positiveCruiseRatio = clamp01(
      Math.max(0, wheelCruiseBoostRef.current) / BLOG_WHEEL_CRUISE_MAX
    )
    const cruiseDecay =
      delta *
      BLOG_WHEEL_CRUISE_DECAY_PER_MS *
      (1 +
        frictionProgress *
          (BLOG_WHEEL_FRICTION_CRUISE_DECAY_MULTIPLIER +
            positiveCruiseRatio * BLOG_WHEEL_FRICTION_CRUISE_PEAK_MULTIPLIER))
    const boostDecay =
      delta *
      BLOG_WHEEL_BOOST_DECAY_PER_MS *
      (1 +
        frictionProgress *
          (BLOG_WHEEL_FRICTION_BOOST_DECAY_MULTIPLIER +
            positiveBoostRatio * BLOG_WHEEL_FRICTION_BOOST_PEAK_MULTIPLIER))
    const currentFrictionPull =
      wheelBoostCurrentRef.current > 0
        ? delta *
          frictionProgress *
          (BLOG_WHEEL_FRICTION_CURRENT_PULL_PER_MS +
            positiveBoostRatio * BLOG_WHEEL_FRICTION_CURRENT_PULL_PEAK_PER_MS)
        : 0

    if (!isActive) {
      wheelCruiseBoostRef.current = approachValue(
        wheelCruiseBoostRef.current,
        0,
        cruiseDecay
      )
      wheelBoostTargetRef.current = approachValue(
        wheelBoostTargetRef.current,
        0,
        boostDecay
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
      const returnBlendResponse =
        1 - Math.exp(-delta / BLOG_SCROLL_RETURN_RELEASE_MS)
      returnBlendRef.current +=
        (returnBlendTarget - returnBlendRef.current) * returnBlendResponse
      wheelBoostCurrentRef.current +=
        (wheelBoostTargetRef.current - wheelBoostCurrentRef.current) *
        responseFactor
      if (currentFrictionPull > 0) {
        wheelBoostCurrentRef.current = approachValue(
          wheelBoostCurrentRef.current,
          wheelCruiseBoostRef.current,
          currentFrictionPull
        )
      }
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
      cruiseDecay
    )
    wheelBoostTargetRef.current = approachValue(
      wheelBoostTargetRef.current,
      wheelCruiseBoostRef.current,
      boostDecay
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
    const returnBlendResponse =
      1 -
      Math.exp(
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
    if (currentFrictionPull > 0) {
      wheelBoostCurrentRef.current = approachValue(
        wheelBoostCurrentRef.current,
        wheelCruiseBoostRef.current,
        currentFrictionPull
      )
    }

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
      className="relative isolate z-10"
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
                      data-home-avatar-keyframe="blog"
                      className="pointer-events-none invisible h-10 w-10 overflow-hidden rounded-full border shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)] sm:h-11 sm:w-11"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <img
                        src={avatarSrc}
                        alt=""
                        aria-hidden="true"
                        data-home-avatar-keyframe-image="blog"
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
          : 'w-[18.5rem] hover:bg-black/[0.025] focus-visible:bg-black/[0.025] sm:w-[24rem] lg:w-[28rem] dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]'
      )}
      style={{ borderLeft: '1px solid var(--border-color)' }}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-0 right-5 left-5 h-px opacity-0 transition-opacity duration-300 sm:right-7 sm:left-7 lg:right-8 lg:left-8',
          isFeatured && 'opacity-100',
          !isFeatured &&
            'group-hover:opacity-100 group-focus-visible:opacity-100'
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
            'text-balance text-black/88 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 dark:text-white/90',
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
