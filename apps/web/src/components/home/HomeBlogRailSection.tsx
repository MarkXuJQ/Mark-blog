import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  motion,
  type MotionValue,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'
import { getAllPosts } from '../../utils/posts'
import type { BlogPost } from '../../types'

interface HomeBlogRailSectionProps {
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionFilter?: MotionValue<string>
  sectionPointerEvents?: MotionValue<string>
}

const BLOG_POST_LIMIT = 8
const RAIL_SPEED = 34

export function HomeBlogRailSection({
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionFilter,
  sectionPointerEvents,
}: HomeBlogRailSectionProps) {
  const { i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const segmentRef = useRef<HTMLDivElement | null>(null)
  const pausedRef = useRef(false)
  const x = useMotionValue(0)
  const [segmentWidth, setSegmentWidth] = useState(0)

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

  useEffect(() => {
    const node = segmentRef.current
    if (!node) return

    const updateWidth = () => {
      setSegmentWidth(node.scrollWidth)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [posts])

  useEffect(() => {
    x.set(0)
  }, [posts, segmentWidth, x])

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || pausedRef.current || segmentWidth <= 0) return

    const distance = (delta / 1000) * RAIL_SPEED
    const next = x.get() - distance
    x.set(next <= -segmentWidth ? next + segmentWidth : next)
  })

  if (posts.length === 0) return null

  return (
    <motion.section
      aria-label={locale === 'zh-CN' ? '首页博客流' : 'Homepage blog rail'}
      className="relative overflow-hidden"
      style={{
        scale: sectionScale,
        y: sectionY,
        opacity: sectionOpacity,
        filter: sectionFilter,
        pointerEvents: sectionPointerEvents,
      }}
    >
      <div
        className="relative min-h-[100svh] overflow-hidden"
        style={{ backgroundColor: 'var(--page-background)' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px"
          style={{ backgroundColor: 'var(--border-color)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ backgroundColor: 'var(--border-color)' }}
        />

        <div className="relative flex min-h-[100svh] items-center py-12 sm:py-14">
          <div
            className={cn(
              'relative w-full',
              prefersReducedMotion
                ? 'scrollbar-hide overflow-x-auto'
                : 'overflow-hidden'
            )}
            onMouseEnter={() => {
              pausedRef.current = true
            }}
            onMouseLeave={() => {
              pausedRef.current = false
            }}
            onFocusCapture={() => {
              pausedRef.current = true
            }}
            onBlurCapture={() => {
              pausedRef.current = false
            }}
            onPointerDownCapture={() => {
              pausedRef.current = true
            }}
            onPointerUpCapture={() => {
              pausedRef.current = false
            }}
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
          </div>
        </div>
      </div>
    </motion.section>
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
