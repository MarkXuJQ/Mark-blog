import { useEffect, useMemo, useRef } from 'react'
import { motion, type MotionValue, useReducedMotion } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getAllPostSummaries } from '@/lib/content/postSummaries'
import { getAllPosts } from '@/lib/content/posts'
import { getOptimizedImageUrl } from '@/lib/image'
import { CategoryLabel } from '@/components/blog/CategoryLabel'
import type { BlogPostSummary } from '@/lib/content/posts'
import { getLifeProvince } from '@/lib/life/provinces'

type LifeRailPost = {
  id: string
  title: string
  date: string
  image?: string
  city?: string
}
type LifeRecord = {
    id: string
    title: string
    date: string
    images?: Array<string | { src: string }>
    meta?: string
    city?: string
}
const lifeFiles = import.meta.glob<{ default?: LifeRecord[] } | LifeRecord[]
>('@content/life/*.json', { eager: true })

function getLifeRecords(module: { default?: LifeRecord[] } | LifeRecord[]) {
  return Array.isArray(module) ? module : (module.default ?? [])
}

interface HomeBlogRailSectionProps {
  avatarSrc: string
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionPointerEvents?: MotionValue<string>
}

const BLOG_POST_LIMIT = 7
const RAIL_INTERVAL = 4500
type EmblaApi = NonNullable<ReturnType<typeof useEmblaCarousel>[1]>
const railImageCache = new Map<string, string>()
const railImagePreloadCache = new Map<string, Promise<void>>()

function preloadRailImage(src: string) {
  const existing = railImagePreloadCache.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = src
  })
  railImagePreloadCache.set(src, promise)
  return promise
}

function getFirstContentImage(content?: string): string | undefined {
  if (!content) return undefined
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1]
}
export function HomeBlogRailSection({
  avatarSrc,
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionPointerEvents,
}: HomeBlogRailSectionProps) {
  const { i18n } = useTranslation()
  const shouldReduceMotion = Boolean(useReducedMotion())
  const railApisRef = useRef<{ blog: EmblaApi | null; life: EmblaApi | null }>({
    blog: null,
    life: null,
  })

  useEffect(() => {
    if (shouldReduceMotion) return
    let timer = 0
    const advanceRails = () => {
      if (document.visibilityState === 'visible') {
        railApisRef.current.blog?.scrollNext()
        railApisRef.current.life?.scrollNext()
      }
      timer = window.setTimeout(advanceRails, RAIL_INTERVAL)
    }
    timer = window.setTimeout(advanceRails, RAIL_INTERVAL)
    return () => window.clearTimeout(timer)
  }, [shouldReduceMotion])

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const allPosts = useMemo(() => {
    const summaries = getAllPostSummaries(i18n.language)
    const fullPosts = getAllPosts(i18n.language)
    const contentImages = new Map(
      fullPosts.map((post) => [post.slug, getFirstContentImage(post.content)])
    )
    return summaries.map((post) => {
      const image =
        railImageCache.get(post.slug) ||
        post.image ||
        contentImages.get(post.slug)
      if (image) railImageCache.set(post.slug, image)
      return image ? { ...post, image } : post
    })
  }, [i18n.language])
  const lifePosts = useMemo<LifeRailPost[]>(
    () =>
      Object.values(lifeFiles)
        .flatMap(getLifeRecords)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7)
        .map((post) => ({
          id: post.id,
          title: post.title,
          date: post.date,
          image:
            typeof post.images?.[0] === 'string'
              ? post.images[0]
              : post.images?.[0]?.src,
          city: post.city ?? post.meta?.split('·')[1]?.trim(),
        })),
    []
  )
  const lifeStats = useMemo(() => {
    const records = Object.values(lifeFiles).flatMap(getLifeRecords)
    return {
      postCount: records.length,
      photoCount: records.reduce(
        (count, post) => count + (post.images?.length ?? 0),
        0
      ),
    }
  }, [])
  const totalWordCount = allPosts.reduce(
    (count, post) => count + (post.wordCount ?? 0),
    0
  )
  const formatWordCount = (count: number, language: string) => {
    if (language === 'zh-CN') {
      if (count >= 10000)
        return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w`
      return count.toLocaleString('zh-CN')
    }
    if (count >= 1000000)
      return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}m`
    if (count >= 1000)
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
    return count.toLocaleString('en-US')
  }
  const posts = useMemo(() => {
    const selectedPosts = allPosts.filter((post) => post.selected)
    return (selectedPosts.length > 0 ? selectedPosts : allPosts).slice(
      0,
      BLOG_POST_LIMIT
    )
  }, [allPosts])
  useEffect(() => {
    const urls = [...posts, ...lifePosts]
      .map((post) => post.image)
      .filter((image): image is string => Boolean(image))
      .map((image) => getOptimizedImageUrl(image, 'card'))
    urls.forEach((url) => {
      void preloadRailImage(url)
    })
  }, [posts, lifePosts])
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
              <div className="flex flex-row items-center justify-between gap-2">
                <div data-home-reveal="blog-header" className="space-y-3">
                  <div className="h-px w-14 bg-black/12 dark:bg-white/16" />
                  <div className="flex items-center gap-2 sm:gap-4">
                    <h2 className="heading-display whitespace-nowrap text-[clamp(1.2rem,5.6vw,2.6rem)] leading-none font-medium tracking-[0.04em] text-black/88 sm:tracking-[0.08em] dark:text-white/90">
                      {locale === 'zh-CN' ? '本站内容' : 'Site Content'}
                    </h2>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none h-8 w-8 shrink-0 overflow-hidden rounded-full shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)] sm:h-11 sm:w-11"
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
                <p className="shrink-0 whitespace-nowrap text-right text-[0.54rem] leading-relaxed tracking-normal text-black/50 sm:text-xs sm:tracking-wide dark:text-white/50">
                  {locale === 'zh-CN' ? (
                    <>
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {allPosts.length}
                      </strong>{' '}
                      篇博客{' '}
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {formatWordCount(totalWordCount, locale)}
                      </strong>{' '}
                      字
                      <br />
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {lifeStats.postCount}
                      </strong>{' '}
                      篇随笔{' '}
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {lifeStats.photoCount}
                      </strong>{' '}
                      张照片
                    </>
                  ) : (
                    <>
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {allPosts.length}
                      </strong>{' '}
                      blog posts ·{' '}
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {formatWordCount(totalWordCount, locale)}
                      </strong>{' '}
                      words
                      <br />
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {lifeStats.postCount}
                      </strong>{' '}
                      life notes ·{' '}
                      <strong className="font-semibold text-black/80 tabular-nums [font-family:'Tourney',sans-serif] text-[1.05rem] leading-none dark:text-white/80 sm:text-xl">
                        {lifeStats.photoCount}
                      </strong>{' '}
                      photos
                    </>
                  )}
                </p>
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

                <div className="flex flex-col gap-5 sm:gap-6 lg:gap-7">
                  <BlogRailRow
                    posts={posts}
                    reverse={false}
                    shouldReduceMotion={shouldReduceMotion}
                    railApisRef={railApisRef}
                    railKey="blog"
                  />
                  <BlogRailRow
                    posts={lifePosts}
                    reverse
                    shouldReduceMotion={shouldReduceMotion}
                    railApisRef={railApisRef}
                    railKey="life"
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

function BlogRailRow({
  posts,
  reverse,
  shouldReduceMotion,
  railApisRef,
  railKey,
}: {
  posts: Array<BlogPostSummary | LifeRailPost>
  reverse: boolean
  shouldReduceMotion: boolean
  railApisRef: React.MutableRefObject<{
    blog: EmblaApi | null
    life: EmblaApi | null
  }>
  railKey: 'blog' | 'life'
}) {
  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      align: (viewSize) => {
        // Keep the two rows visibly staggered: the LTR blog row starts near
        // the left edge, while the RTL life row starts near the right edge.
        // The inset stays deliberately small on phone-sized viewports.
        return Math.min(Math.max(viewSize * 0.035, 10), 48)
      },
      loop: true,
      containScroll: false,
      skipSnaps: true,
      direction: reverse ? 'rtl' : 'ltr',
    }
  )

  useEffect(() => {
    railApisRef.current[railKey] = emblaApi ?? null
    return () => {
      railApisRef.current[railKey] = null
    }
  }, [emblaApi, railApisRef, railKey])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.reInit({ loop: !shouldReduceMotion && posts.length > 1 })
  }, [emblaApi, posts.length, shouldReduceMotion])

  if (posts.length === 0) return null

  return (
    <div
      ref={viewportRef}
      dir={reverse ? 'rtl' : 'ltr'}
      className="overflow-hidden"
    >
      <div className="flex touch-pan-y">
        {posts.map((post) => (
          <div
            key={'slug' in post ? post.slug : post.id}
            dir="ltr"
            className={`min-w-0 shrink-0 basis-[min(78vw,calc(100vw_-_2rem))] sm:basis-[22rem] lg:basis-[26rem] ${reverse ? 'ml-3 sm:ml-4 lg:ml-5' : 'mr-3 sm:mr-4 lg:mr-5'}`}
          >
            <BlogRailItem post={post} />
          </div>
        ))}
      </div>
    </div>
  )
}

function BlogRailItem({
  post,
}: {
  post: BlogPostSummary | LifeRailPost
}) {
  return (
    <Link
      to={'slug' in post ? `/blog/${post.slug}` : '/life'}
      className="group relative flex h-44 w-full items-end overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 px-5 py-5 text-white shadow-[0_20px_55px_-36px_rgba(15,23,42,0.8)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_26px_65px_-36px_rgba(15,23,42,0.9)] sm:h-48 sm:px-6 dark:border-white/10"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-slate-800" />
      {post.image ? (
        <img
          src={getOptimizedImageUrl(post.image, 'card')}
          data-original-src={post.image}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            const image = event.currentTarget
            const original = image.dataset.originalSrc
            if (original && image.src !== original) {
              image.src = original
            } else {
              image.style.opacity = '0'
            }
          }}
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
        {'category' in post && post.category ? (
          <CategoryLabel
            category={post.category}
            className="mt-2 text-[0.62rem] tracking-[0.16em] text-white/70 uppercase"
            iconClassName="h-3 w-3"
          />
        ) : 'city' in post ? (
          <div className="mt-2 flex items-center gap-2 text-[0.62rem] tracking-[0.12em] text-white/70">
            <time dateTime={post.date}>{post.date}</time>
            <span aria-hidden="true">·</span>
            {getLifeProvince(post.city)?.icon ? (
              <img
                src={getLifeProvince(post.city)?.icon}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 shrink-0 object-contain text-white/80"
              />
            ) : null}
            <span className="truncate">{post.city ?? 'Location not noted'}</span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}
