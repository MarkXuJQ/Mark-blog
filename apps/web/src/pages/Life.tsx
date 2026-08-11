import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
  ListFilter,
  ChevronDown,
  ArrowDown,
  Images,
  MapPin,
} from 'lucide-react'
import { DeferredComments } from '@/components/comments/DeferredComments'
import { getTwikooApi, loadTwikooScript } from '@/lib/comments/twikooLoader'
import { Seo } from '@/app/seo/Seo'
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from '@/components/ui/Dropdown'
import { useLightbox } from '@/hooks/useLightbox'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { getOriginalImageUrl, getOptimizedImageUrl } from '@/lib/image'
import { cn } from '@/lib/classNames'
import lifeIsStrangeBackground from '@/assets/background/lifeisStrange.webp'

type ImageInput = string | { src: string; alt?: string; hdr?: boolean }

type RawLifePost = {
  id: string
  date: string
  title: string
  image?: ImageInput
  images?: ImageInput[]
  city?: string
  meta: string
  content: string
}

type LifePost = Omit<RawLifePost, 'image' | 'images'> & {
  images: LifeImage[]
}

type LifeImage = {
  original: string
  preview: string
  thumbnail: string
  hdr: boolean
}

type ImageSwitchDirection = -1 | 1

type SwitchImageOptions = {
  force?: boolean
  direction?: ImageSwitchDirection
}

const FEATURED_CAROUSEL_INTERVAL_MS = 5000
const LIFE_DETAIL_POST_PARAM = 'lifePost'
const LIFE_DETAIL_IMAGE_PARAM = 'lifePhoto'

const lifePhotoVariants: Variants = {
  enter: (direction: ImageSwitchDirection) => ({
    x: direction > 0 ? '100%' : '-100%',
  }),
  center: { x: 0 },
  exit: (direction: ImageSwitchDirection) => ({
    x: direction > 0 ? '-100%' : '100%',
  }),
}

const lifeYearFiles = import.meta.glob<{ default: RawLifePost[] }>(
  '@content/life/*.json',
  { eager: true }
)

function normalizeImageSrc(input: ImageInput): string {
  const src = typeof input === 'string' ? input : input.src
  const trimmed = src.trim().replace(/[)）]+$/, '')
  return getOriginalImageUrl(trimmed)
}

function normalizeLifeImage(input: ImageInput): LifeImage {
  const original = normalizeImageSrc(input)
  const hdr = typeof input !== 'string' && input.hdr === true
  return {
    original,
    preview: hdr ? original : getOptimizedImageUrl(original, 'preview'),
    thumbnail: getOptimizedImageUrl(original, 'thumbnail'),
    hdr,
  }
}

function parseCityFromMeta(meta: string): string | undefined {
  const parts = meta
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
  const maybe = parts[1]
  return maybe ? maybe : undefined
}

function splitLifeContent(content: string): string[][] {
  return content
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split(/\n/).map((line) => line.trimEnd()))
    .filter((paragraph) => paragraph.some((line) => line.trim().length > 0))
}

export function Life() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const title = t('nav.life')
  const description = t('life.description', '生活随笔瀑布流。')
  const { openLightbox } = useLightbox()
  const isMobileDetail = useMediaQuery('(max-width: 767px)')
  const prefersReducedMotion = usePrefersReducedMotion()
  const twikooEnvId =
    import.meta.env.VITE_TWIKOO_ENV_ID ||
    'https://comments.markxu.icu/api/twikoo'

  const posts = useMemo(() => {
    const merged = Object.values(lifeYearFiles).flatMap(
      (module) => module.default ?? []
    )
    const normalized: LifePost[] = merged
      .map((post) => {
        const rawImages = Array.isArray(post.images)
          ? post.images
          : post.image
            ? [post.image]
            : []
        const images = rawImages.map(normalizeLifeImage)
        const city = post.city ?? parseCityFromMeta(post.meta)
        return { ...post, images, city }
      })
      .filter((post) => post.images.length > 0)

    return normalized
  }, [])

  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const commentCountsRefreshTimerRef = useRef<number | null>(null)
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, true>>({})
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedCities, setSelectedCities] = useState<Record<string, true>>({})

  const availableCities = useMemo(() => {
    const set = new Set<string>()
    for (const post of posts) {
      if (post.city) set.add(post.city)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  }, [posts])

  const selectedCityList = useMemo(() => {
    return Object.keys(selectedCities).sort((a, b) =>
      a.localeCompare(b, 'zh-Hans-CN')
    )
  }, [selectedCities])

  const filteredPosts = useMemo(() => {
    const hasCityFilter = selectedCityList.length > 0
    return hasCityFilter
      ? posts.filter((p) => p.city && selectedCities[p.city])
      : posts
  }, [posts, selectedCities, selectedCityList.length])

  const featuredPost = useMemo(() => {
    return (
      [...filteredPosts].sort((a, b) => {
        const dateDifference =
          new Date(b.date).getTime() - new Date(a.date).getTime()
        return dateDifference || a.id.localeCompare(b.id)
      })[0] ?? null
    )
  }, [filteredPosts])

  const displayPosts = useMemo(() => {
    const sorted = [...filteredPosts].sort((a, b) => {
      const aTime = new Date(a.date).getTime()
      const bTime = new Date(b.date).getTime()
      if (aTime === bTime) return a.id.localeCompare(b.id)
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime
    })

    return sorted
  }, [filteredPosts, sortOrder])

  const regularPosts = useMemo(
    () => displayPosts.filter((post) => post.id !== featuredPost?.id),
    [displayPosts, featuredPost]
  )

  const featuredPostId = featuredPost?.id ?? null
  const featuredImageCount = featuredPost?.images.length ?? 0
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0)
  const [isFeaturedVisible, setIsFeaturedVisible] = useState(true)
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === 'undefined'
      ? true
      : document.visibilityState !== 'hidden'
  )
  const featuredSectionRef = useRef<HTMLElement | null>(null)
  const requestedActiveImageIndexRef = useRef(0)
  const safeFeaturedImageIndex = Math.min(
    featuredImageIndex,
    Math.max(featuredImageCount - 1, 0)
  )
  const featuredImage =
    featuredPost?.images[safeFeaturedImageIndex] ??
    featuredPost?.images[0] ??
    null
  const featuredImageSrc = featuredImage
    ? getOptimizedImageUrl(
        featuredImage.original,
        isMobileDetail ? 'thumbnail' : 'cover'
      )
    : ''
  const featuredImageFailureKey = featuredPostId
    ? `${featuredPostId}:${safeFeaturedImageIndex}`
    : ''
  const featuredNextImageIndex =
    featuredImageCount > 1
      ? (safeFeaturedImageIndex + 1) % featuredImageCount
      : null
  const featuredNextImage =
    featuredNextImageIndex === null
      ? null
      : (featuredPost?.images[featuredNextImageIndex] ?? null)
  const featuredNextImageSrc = featuredNextImage
    ? getOptimizedImageUrl(
        featuredNextImage.original,
        isMobileDetail ? 'thumbnail' : 'cover'
      )
    : ''
  const featuredNextImageFailureKey =
    featuredPostId && featuredNextImageIndex !== null
      ? `${featuredPostId}:${featuredNextImageIndex}`
      : ''

  const [activeId, setActiveId] = useState<string | null>(null)
  const activePost = useMemo(
    () => posts.find((p) => p.id === activeId) ?? null,
    [activeId, posts]
  )
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [imageDirection, setImageDirection] = useState<ImageSwitchDirection>(1)
  const activeImages = useMemo(() => activePost?.images ?? [], [activePost])
  const contentRef = useRef<HTMLDivElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const failedImagesRef = useRef<Set<string>>(new Set())
  const imageSwipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const [, forceRerender] = useState(0)
  const currentImage = activeImages[activeImageIndex] ?? activeImages[0] ?? null
  const currentImageSrc = currentImage?.preview ?? ''

  const requestedPostId = searchParams.get(LIFE_DETAIL_POST_PARAM)
  const requestedImageIndex = Number.parseInt(
    searchParams.get(LIFE_DETAIL_IMAGE_PARAM) ?? '0',
    10
  )
  const initialImageIndex = Number.isFinite(requestedImageIndex)
    ? Math.max(requestedImageIndex, 0)
    : 0

  const updateDetailImageUrl = (imageIndex: number) => {
    setSearchParams(
      (previous) => {
        if (!previous.has(LIFE_DETAIL_POST_PARAM)) return previous
        const next = new URLSearchParams(previous)
        next.set(LIFE_DETAIL_IMAGE_PARAM, String(imageIndex))
        return next
      },
      { replace: true }
    )
  }

  const openPost = (postId: string, imageIndex = 0) => {
    requestedActiveImageIndexRef.current = imageIndex
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set(LIFE_DETAIL_POST_PARAM, postId)
      if (imageIndex > 0) {
        next.set(LIFE_DETAIL_IMAGE_PARAM, String(imageIndex))
      } else {
        next.delete(LIFE_DETAIL_IMAGE_PARAM)
      }
      return next
    })
  }

  const closePost = () => {
    if (!searchParams.has(LIFE_DETAIL_POST_PARAM)) {
      setActiveId(null)
      return
    }

    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete(LIFE_DETAIL_POST_PARAM)
        next.delete(LIFE_DETAIL_IMAGE_PARAM)
        return next
      },
      { replace: true }
    )
  }

  const handleCardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    target.style.setProperty('--x-rotate', `${y * -8}deg`)
    target.style.setProperty('--y-rotate', `${x * 8}deg`)
  }

  const handleCardMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    target.style.setProperty('--x-rotate', '0deg')
    target.style.setProperty('--y-rotate', '0deg')
  }

  const refreshCommentCounts = useEffectEvent(async (postIds?: string[]) => {
    if (typeof window === 'undefined') return
    if (!twikooEnvId) return
    if (window.__PRERENDER__) return
    if (posts.length === 0) return
    try {
      await loadTwikooScript()
      const twikooApi = getTwikooApi()
      if (!twikooApi?.getCommentsCount) return
      const ids =
        postIds && postIds.length > 0 ? postIds : posts.map((p) => p.id)
      const urls = ids.map((id) => `/life/${id}`)
      const res = await twikooApi.getCommentsCount({
        envId: twikooEnvId,
        urls,
        includeReply: false,
      })
      const next: Record<string, number> = {}
      for (const item of res) {
        if (!item?.url) continue
        const id = item.url.startsWith('/life/')
          ? item.url.slice('/life/'.length)
          : item.url
        next[id] = typeof item.count === 'number' ? item.count : 0
      }
      setCommentCounts((prev) => ({ ...prev, ...next }))
    } catch {
      return
    }
  })

  useEffect(() => {
    void refreshCommentCounts()
  }, [posts, refreshCommentCounts, twikooEnvId])

  useEffect(() => {
    setFeaturedImageIndex(0)
  }, [featuredPostId])

  useEffect(() => {
    const updatePageVisibility = () => {
      setIsPageVisible(document.visibilityState !== 'hidden')
    }

    updatePageVisibility()
    document.addEventListener('visibilitychange', updatePageVisibility)
    return () =>
      document.removeEventListener('visibilitychange', updatePageVisibility)
  }, [])

  useEffect(() => {
    const section = featuredSectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') {
      setIsFeaturedVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFeaturedVisible(Boolean(entry?.isIntersecting))
      },
      { threshold: 0.08 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [featuredPostId])

  useEffect(() => {
    if (!featuredPost || featuredImageCount <= 1) return

    const nextIndex = (safeFeaturedImageIndex + 1) % featuredImageCount
    const nextImage = featuredPost.images[nextIndex]
    if (!nextImage) return

    const preload = new Image()
    preload.decoding = 'async'
    preload.src = getOptimizedImageUrl(
      nextImage.original,
      isMobileDetail ? 'thumbnail' : 'cover'
    )
  }, [featuredImageCount, featuredPost, isMobileDetail, safeFeaturedImageIndex])

  useEffect(() => {
    if (
      featuredImageCount <= 1 ||
      prefersReducedMotion ||
      !isFeaturedVisible ||
      !isPageVisible ||
      activeId
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      setFeaturedImageIndex(
        (current) =>
          (Math.min(current, featuredImageCount - 1) + 1) % featuredImageCount
      )
    }, FEATURED_CAROUSEL_INTERVAL_MS)

    return () => window.clearTimeout(timer)
  }, [
    activeId,
    featuredImageCount,
    featuredImageIndex,
    isFeaturedVisible,
    isPageVisible,
    prefersReducedMotion,
  ])

  useEffect(() => {
    requestedActiveImageIndexRef.current = initialImageIndex
    setActiveId(requestedPostId)
  }, [initialImageIndex, requestedPostId])

  useEffect(() => {
    if (!activeId || !activePost) return
    const requestedIndex = Math.min(
      Math.max(requestedActiveImageIndexRef.current, 0),
      Math.max(activePost.images.length - 1, 0)
    )
    requestedActiveImageIndexRef.current = 0
    setActiveImageIndex(requestedIndex)
    setImageDirection(1)
    failedImagesRef.current = new Set()
  }, [activeId, activePost])

  useEffect(() => {
    if (!isMobileDetail || !activePost || activeImages.length === 0) return

    const indices = new Set([activeImageIndex])
    if (activeImages.length > 1) {
      indices.add(
        activeImageIndex === 0 ? activeImages.length - 1 : activeImageIndex - 1
      )
      indices.add(
        activeImageIndex === activeImages.length - 1 ? 0 : activeImageIndex + 1
      )
    }

    for (const index of indices) {
      const image = activeImages[index]
      if (!image || image.hdr || !image.preview) continue

      const preload = new Image()
      preload.decoding = 'async'
      preload.fetchPriority = index === activeImageIndex ? 'high' : 'low'
      preload.src = image.preview
    }
  }, [activeImageIndex, activeImages, activePost, isMobileDetail])

  useEffect(() => {
    return () => {
      if (commentCountsRefreshTimerRef.current) {
        window.clearTimeout(commentCountsRefreshTimerRef.current)
      }
    }
  }, [])

  const switchToImage = (nextIndex: number, options?: SwitchImageOptions) => {
    if (activeImages.length === 0) return
    if (!options?.force && nextIndex === activeImageIndex) return

    if (!activeImages[nextIndex]) return
    const direction =
      options?.direction ?? (nextIndex >= activeImageIndex ? 1 : -1)

    setImageDirection(direction)
    setActiveImageIndex(nextIndex)
    updateDetailImageUrl(nextIndex)

    // Normal changes are rendered immediately with the thumbnail fallback. A
    // forced retry still primes the display URL before the image is redrawn.
    if (options?.force) {
      const retrySrc = activeImages[nextIndex]?.preview
      if (!retrySrc) return
      const retry = new Image()
      retry.decoding = 'async'
      retry.onload = () => forceRerender((x) => x + 1)
      retry.onerror = () => {
        failedImagesRef.current.add(retrySrc)
        forceRerender((x) => x + 1)
      }
      retry.src = retrySrc
    }
  }

  const goPrevImage = () => {
    if (activeImages.length <= 1) return
    const nextIndex =
      activeImageIndex === 0 ? activeImages.length - 1 : activeImageIndex - 1
    switchToImage(nextIndex, { direction: -1 })
  }

  const goNextImage = () => {
    if (activeImages.length <= 1) return
    const nextIndex =
      activeImageIndex === activeImages.length - 1 ? 0 : activeImageIndex + 1
    switchToImage(nextIndex, { direction: 1 })
  }

  const handlePhotoTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileDetail || event.touches.length !== 1) return
    const touch = event.touches[0]
    if (!touch) return
    imageSwipeStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handlePhotoTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = imageSwipeStartRef.current
    imageSwipeStartRef.current = null
    if (!isMobileDetail || !start || activeImages.length <= 1) return

    const touch = event.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const isHorizontalSwipe =
      Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15
    if (!isHorizontalSwipe) return

    if (deltaX < 0) goNextImage()
    else goPrevImage()
  }

  const handleDialogKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const tag = target?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea') return
    if (e.key === 'Escape') closePost()
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrevImage()
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNextImage()
    }
  })

  const handleLifeCommentLoaded = useEffectEvent(() => {
    const postId = activePost?.id
    if (!postId) return
    if (commentCountsRefreshTimerRef.current) {
      window.clearTimeout(commentCountsRefreshTimerRef.current)
    }
    commentCountsRefreshTimerRef.current = window.setTimeout(() => {
      void refreshCommentCounts([postId])
    }, 250)
  })

  useEffect(() => {
    if (!activeId) return
    document.addEventListener('keydown', handleDialogKeyDown)
    return () => document.removeEventListener('keydown', handleDialogKeyDown)
  }, [activeId, handleDialogKeyDown])

  useEffect(() => {
    if (!activeId) return
    lastFocusedRef.current = document.activeElement as HTMLElement | null
    setTimeout(() => modalRef.current?.focus(), 0)
    return () => {
      lastFocusedRef.current?.focus()
      lastFocusedRef.current = null
    }
  }, [activeId])

  useEffect(() => {
    if (!activeId) return
    const body = document.body
    const html = document.documentElement
    const scrollY = window.scrollY
    const isTouchDevice =
      'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0

    const prevBodyOverflow = body.style.overflow
    const prevHtmlOverflow = html.style.overflow
    const prevBodyPosition = body.style.position
    const prevBodyTop = body.style.top
    const prevBodyLeft = body.style.left
    const prevBodyRight = body.style.right
    const prevBodyWidth = body.style.width

    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'

    if (isTouchDevice) {
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
    }

    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      touchStartY = e.touches[0]?.clientY ?? 0
    }

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target
      if (!target || !(target instanceof Node)) {
        e.preventDefault()
        return
      }

      const content = contentRef.current
      if (!content || !content.contains(target)) {
        e.preventDefault()
        return
      }

      const currentY = e.touches[0]?.clientY ?? 0
      const deltaY = currentY - touchStartY

      const atTop = content.scrollTop <= 0
      const atBottom =
        content.scrollTop + content.clientHeight >= content.scrollHeight - 1

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    window.dispatchEvent(
      new CustomEvent('app:overlay', { detail: { open: true } })
    )

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)

      body.style.overflow = prevBodyOverflow
      html.style.overflow = prevHtmlOverflow
      body.style.position = prevBodyPosition
      body.style.top = prevBodyTop
      body.style.left = prevBodyLeft
      body.style.right = prevBodyRight
      body.style.width = prevBodyWidth

      if (isTouchDevice) {
        window.scrollTo(0, scrollY)
      }

      window.dispatchEvent(
        new CustomEvent('app:overlay', { detail: { open: false } })
      )
    }
  }, [activeId])

  return (
    <>
      <Seo title={title} description={description} />

      <div className="relative isolate z-10 w-full pt-28">
        {featuredPost && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          >
            <img
              src={lifeIsStrangeBackground}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_42%] opacity-42 saturate-[0.82] sm:opacity-46 lg:opacity-50 dark:opacity-36"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-[var(--page-background)] opacity-18 dark:opacity-28" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--page-background)_32%,transparent)_0%,transparent_38%,var(--page-background)_100%)]" />
          </div>
        )}

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 sm:pt-5 md:pt-7">
          <h1 className="sr-only">{title}</h1>

          {featuredPost && (
            <section ref={featuredSectionRef} className="relative mb-3 sm:mb-4">
              <div className="relative">
                <div className="relative isolate pt-1 [clip-path:inset(-4rem_-4rem_3rem_-4rem)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-6 left-1/2 z-0 h-[calc(100%+1.5rem)] w-[84%] -translate-x-[52%] -rotate-[2deg] bg-[#f1f2f0] shadow-[0_14px_35px_-24px_rgba(15,23,42,0.5)] ring-1 ring-black/5 sm:w-[80%] md:w-[76%] dark:bg-[#e6e7e4]"
                  />

                  {featuredNextImageSrc && (
                    <motion.div
                      key={featuredNextImageFailureKey}
                      aria-hidden="true"
                      initial={prefersReducedMotion ? false : { y: 18 }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.62,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="pointer-events-none absolute top-3 left-1/2 z-10 h-[calc(100%+1.5rem)] w-[86%] -translate-x-[48%] rotate-[1.6deg] bg-[#fafafa] p-1.5 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.62)] ring-1 ring-black/5 sm:w-[82%] sm:p-2 md:w-[78%]"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-slate-200">
                        {failedCoverIds[featuredNextImageFailureKey] ? (
                          <div className="h-full w-full bg-slate-300" />
                        ) : (
                          <img
                            src={featuredNextImageSrc}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            onError={() =>
                              setFailedCoverIds((prev) => ({
                                ...prev,
                                [featuredNextImageFailureKey]: true,
                              }))
                            }
                          />
                        )}
                      </div>
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      openPost(featuredPost.id, safeFeaturedImageIndex)
                    }
                    className={cn(
                      'group relative z-[15] mx-auto block w-[84%] bg-[#fafafa] p-1.5 pb-0 text-left',
                      'shadow-[0_22px_55px_-30px_rgba(15,23,42,0.7),0_4px_14px_-8px_rgba(15,23,42,0.28)] ring-1 ring-black/5',
                      'transition-transform duration-300 ease-out hover:-translate-y-1',
                      'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/70',
                      'sm:w-[80%] sm:p-2 sm:pb-0 md:w-[74%] lg:w-[72%]'
                    )}
                    aria-label={`打开：${featuredPost.title}`}
                  >
                    <motion.div
                      layoutId={
                        isMobileDetail
                          ? undefined
                          : `life-image-${featuredPost.id}`
                      }
                      className="relative aspect-video w-full overflow-hidden bg-slate-200"
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                      <AnimatePresence initial={false} custom={1}>
                        {featuredImageSrc &&
                          (failedCoverIds[featuredImageFailureKey] ? (
                            <motion.div
                              key={`${featuredImageFailureKey}-error`}
                              custom={1}
                              variants={lifePhotoVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                duration: 0.62,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="absolute inset-0 flex items-center justify-center bg-slate-700 text-sm text-white/70"
                            >
                              图片加载失败
                            </motion.div>
                          ) : (
                            <motion.img
                              key={featuredImageFailureKey}
                              src={featuredImageSrc}
                              alt={featuredPost.title}
                              custom={1}
                              variants={lifePhotoVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                duration: 0.62,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                              loading="eager"
                              fetchPriority={
                                safeFeaturedImageIndex === 0 ? 'high' : 'auto'
                              }
                              decoding="async"
                              draggable={false}
                              onError={() =>
                                setFailedCoverIds((prev) => ({
                                  ...prev,
                                  [featuredImageFailureKey]: true,
                                }))
                              }
                            />
                          ))}
                      </AnimatePresence>
                    </motion.div>

                    <div className="min-h-[9rem] px-2 pt-3 pb-12 text-slate-900 sm:px-3 sm:pt-4">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 sm:text-sm">
                        <time dateTime={featuredPost.date}>
                          {featuredPost.date}
                        </time>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} aria-hidden="true" />
                          {featuredPost.city ?? t('life.unknownLocation')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Images size={14} aria-hidden="true" />
                          {t('life.photoCount', {
                            count: featuredPost.images.length,
                          })}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-xl font-[var(--font-heading)] font-bold text-balance text-slate-900 sm:text-2xl">
                        {featuredPost.title}
                      </p>
                    </div>
                  </button>
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-12 left-1/2 z-20 w-[92%] -translate-x-1/2 border-t border-slate-400/55 sm:w-[88%] md:w-[82%] dark:border-white/22"
                />
              </div>
            </section>
          )}

          <div className="relative z-20 flex flex-wrap items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
              }
              className={cn(
                'btn-secondary flex cursor-pointer items-center justify-center gap-2 select-none active:scale-95'
              )}
            >
              <ArrowDown
                size={16}
                className={cn(
                  sortOrder === 'desc'
                    ? 'rotate-0 text-blue-500'
                    : 'rotate-180 text-green-500',
                  'transition-transform'
                )}
              />
              <span className="min-w-[4.5rem] text-left">
                {sortOrder === 'desc' ? '最新优先' : '最早优先'}
              </span>
            </button>

            {availableCities.length > 0 && (
              <Dropdown>
                <DropdownTrigger
                  className={cn(
                    'btn-secondary flex cursor-pointer items-center gap-2'
                  )}
                >
                  <ListFilter size={16} />
                  <span className="whitespace-nowrap">
                    {selectedCityList.length === 0
                      ? '城市：全部'
                      : `城市：${selectedCityList.slice(0, 2).join('、')}${
                          selectedCityList.length > 2
                            ? ` +${selectedCityList.length - 2}`
                            : ''
                        }`}
                  </span>
                  <ChevronDown size={14} />
                </DropdownTrigger>

                <DropdownContent
                  align="end"
                  className="w-64 max-w-[calc(100vw-2rem)] p-2"
                >
                  <div className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                    多选城市
                  </div>
                  <div className="max-h-72 overflow-y-auto px-1">
                    {availableCities.map((city) => {
                      const checked = Boolean(selectedCities[city])
                      return (
                        <label
                          key={city}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                            'hover:bg-slate-100 dark:hover:bg-[#23262c]'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedCities((prev) => {
                                const next = { ...prev }
                                if (next[city]) delete next[city]
                                else next[city] = true
                                return next
                              })
                            }}
                          />
                          <span className="flex-1">{city}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-[#2b2f36]">
                    <button
                      type="button"
                      onClick={() => setSelectedCities({})}
                      className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#23262c]"
                    >
                      清空
                    </button>
                    <div className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                      {selectedCityList.length === 0
                        ? `共 ${availableCities.length} 个`
                        : `已选 ${selectedCityList.length} 个`}
                    </div>
                  </div>
                </DropdownContent>
              </Dropdown>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-0 mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6 md:pb-10">
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {regularPosts.map((post) => (
            <motion.div
              key={post.id}
              className={cn(
                'group relative mb-4 inline-block w-full rounded-2xl',
                'text-left transition-transform duration-200 ease-out',
                '[transform:perspective(1200px)_rotateX(var(--x-rotate,0deg))_rotateY(var(--y-rotate,0deg))]',
                'will-change-transform',
                'focus-within:ring-2 focus-within:ring-blue-500/60 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-[#101114]',
                'break-inside-avoid'
              )}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
            >
              <button
                type="button"
                onClick={() => openPost(post.id)}
                className="block w-full text-left focus:outline-none"
                aria-label={`打开：${post.title}`}
              >
                <motion.div
                  layoutId={
                    isMobileDetail ? undefined : `life-image-${post.id}`
                  }
                  className="relative min-h-[160px] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-[#1f2328]"
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  {failedCoverIds[post.id] ? (
                    <div className="flex min-h-[160px] w-full items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      图片加载失败
                    </div>
                  ) : (
                    <img
                      src={post.images[0]?.thumbnail}
                      alt={post.title}
                      className="h-auto min-h-[160px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                      onError={() =>
                        setFailedCoverIds((prev) => ({
                          ...prev,
                          [post.id]: true,
                        }))
                      }
                    />
                  )}
                </motion.div>

                <div className="px-1.5 pt-2">
                  <div className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {post.title}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <time dateTime={post.date}>{post.date}</time>
                    <span
                      className="flex shrink-0 items-center gap-1"
                      aria-label={t('life.photoCount', {
                        count: post.images.length,
                      })}
                    >
                      <Images size={13} aria-hidden="true" />
                      <span>{post.images.length}</span>
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activePost && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-stretch justify-stretch p-0 md:items-center md:justify-center md:p-4"
            initial={{ opacity: isMobileDetail ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: isMobileDetail ? 1 : 0 }}
            onWheel={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!contentRef.current) return
              contentRef.current.scrollBy({ top: e.deltaY })
            }}
          >
            <motion.button
              type="button"
              aria-label="关闭"
              onClick={closePost}
              className="absolute inset-0 hidden bg-black/70 backdrop-blur-sm md:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              initial={isMobileDetail ? { x: '100%' } : { x: 0 }}
              animate={{ x: 0 }}
              exit={isMobileDetail ? { x: '100%' } : { x: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'relative z-10 h-[100dvh] w-full max-w-none overflow-hidden rounded-none border-0 bg-white shadow-none outline-none',
                'dark:bg-[#17191c]',
                'md:h-auto md:max-w-5xl md:rounded-2xl md:border md:border-slate-200/70 md:shadow-2xl',
                'md:dark:border-[#2b2f36]'
              )}
            >
              <div
                ref={isMobileDetail ? contentRef : undefined}
                className="flex h-full flex-col overflow-y-auto overscroll-contain md:h-auto md:max-h-[85vh] md:flex-row md:overflow-hidden"
              >
                <div className="relative shrink-0 bg-black md:w-[66%]">
                  <motion.div
                    layoutId={
                      isMobileDetail ? undefined : `life-image-${activePost.id}`
                    }
                    className="group relative isolate overflow-hidden rounded-none md:rounded-2xl"
                  >
                    {!failedImagesRef.current.has(currentImageSrc) &&
                      currentImageSrc && (
                        <img
                          src={currentImage?.thumbnail}
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] object-cover opacity-30 blur-2xl brightness-90"
                          loading="eager"
                          decoding="async"
                          draggable={false}
                        />
                      )}
                    <div
                      className={cn(
                        'relative z-10 aspect-[4/3] h-auto w-full touch-pan-y overflow-hidden',
                        activeImages.length > 1
                          ? 'md:aspect-auto md:h-[calc(85vh-5rem)]'
                          : 'md:aspect-auto md:h-[85vh]'
                      )}
                      onTouchStart={handlePhotoTouchStart}
                      onTouchEnd={handlePhotoTouchEnd}
                      onTouchCancel={() => {
                        imageSwipeStartRef.current = null
                      }}
                    >
                      {failedImagesRef.current.has(currentImageSrc) ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-200">
                          <div className="text-sm">图片加载失败</div>
                          <button
                            type="button"
                            onClick={() => {
                              const src = currentImageSrc
                              if (src) failedImagesRef.current.delete(src)
                              forceRerender((x) => x + 1)
                              if (activeImageIndex >= 0) {
                                switchToImage(activeImageIndex, { force: true })
                              }
                            }}
                            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/15"
                          >
                            重新加载
                          </button>
                        </div>
                      ) : (
                        <AnimatePresence
                          initial={false}
                          custom={imageDirection}
                        >
                          {currentImage?.thumbnail && (
                            <img
                              src={currentImage.thumbnail}
                              alt=""
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
                              loading="eager"
                              decoding="async"
                              draggable={false}
                            />
                          )}
                          <motion.img
                            key={currentImageSrc}
                            src={currentImageSrc}
                            srcSet={
                              currentImage?.hdr
                                ? undefined
                                : `${currentImage?.thumbnail} 420w, ${currentImage?.preview} 1280w`
                            }
                            sizes="(max-width: 767px) 100vw, 66vw"
                            alt={activePost.title}
                            custom={imageDirection}
                            variants={lifePhotoVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                              duration: 0.34,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className={cn(
                              'absolute inset-0 z-[1] h-full w-full object-contain select-none',
                              currentImage?.hdr && 'hdr-image'
                            )}
                            data-hdr-image={
                              currentImage?.hdr ? 'true' : undefined
                            }
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            onError={() => {
                              const src = currentImageSrc
                              if (!src) return
                              failedImagesRef.current.add(src)
                              forceRerender((x) => x + 1)
                            }}
                          />
                        </AnimatePresence>
                      )}

                      {activeImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={goPrevImage}
                            className="absolute inset-y-0 left-0 z-20 w-[10%] cursor-w-resize focus:outline-none"
                            aria-label="上一张"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              openLightbox(
                                activeImages.map((img) => ({
                                  src: img.hdr ? img.original : img.preview,
                                  alt: activePost.title,
                                  description: activePost.meta,
                                  hdr: img.hdr,
                                  optimized: !img.hdr,
                                })),
                                activeImageIndex
                              )
                            }
                            className="absolute inset-y-0 left-[10%] z-20 w-[80%] cursor-zoom-in focus:outline-none"
                            aria-label="打开灯箱"
                          />
                          <button
                            type="button"
                            onClick={goNextImage}
                            className="absolute inset-y-0 right-0 z-20 w-[10%] cursor-e-resize focus:outline-none"
                            aria-label="下一张"
                          />

                          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/80">
                            <ChevronLeft size={18} />
                          </div>
                          <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/80">
                            <ChevronRight size={18} />
                          </div>

                          <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/45 px-2 py-1 text-xs text-white/90 backdrop-blur">
                            {activeImageIndex + 1}/{activeImages.length}
                          </div>
                        </>
                      )}

                      {activeImages.length <= 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            openLightbox(
                              activeImages.map((img) => ({
                                src: img.hdr ? img.original : img.preview,
                                alt: activePost.title,
                                description: activePost.meta,
                                hdr: img.hdr,
                                optimized: !img.hdr,
                              })),
                              activeImageIndex
                            )
                          }
                          className="absolute inset-0 z-20 cursor-zoom-in focus:outline-none"
                          aria-label="打开灯箱"
                        />
                      )}
                    </div>
                  </motion.div>

                  {activeImages.length > 1 && (
                    <div
                      className="relative z-20 mx-3 my-2 flex gap-2 overflow-x-auto rounded-xl bg-white/8 p-2"
                      aria-label="选择照片"
                    >
                      {activeImages.map((image, idx) => (
                        <button
                          key={`${image.original}-${idx}`}
                          type="button"
                          onClick={() => switchToImage(idx)}
                          className={cn(
                            'relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border',
                            idx === activeImageIndex
                              ? 'border-white/70'
                              : 'border-white/15 opacity-80 hover:opacity-100'
                          )}
                          aria-label={`切换到第 ${idx + 1} 张`}
                        >
                          <img
                            src={image.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={closePost}
                    className={cn(
                      'absolute top-3 left-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full md:right-3 md:left-auto',
                      'bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/55',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                    )}
                    aria-label={isMobileDetail ? '返回生活随笔' : '关闭弹层'}
                  >
                    {isMobileDetail ? (
                      <ChevronLeft size={20} />
                    ) : (
                      <X size={18} />
                    )}
                  </button>
                </div>

                <div
                  ref={isMobileDetail ? undefined : contentRef}
                  className="flex flex-none flex-col overflow-visible p-5 pb-8 md:min-h-0 md:flex-1 md:overflow-y-scroll md:overscroll-contain md:p-6"
                >
                  <div className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {activePost.title}
                  </div>
                  <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    {activePost.meta}
                  </div>

                  <div className="mb-6 space-y-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                    {splitLifeContent(activePost.content).map(
                      (paragraph, paragraphIndex) => (
                        <p key={`${activePost.id}-paragraph-${paragraphIndex}`}>
                          {paragraph.map((line, lineIndex) => (
                            <span
                              key={`${activePost.id}-line-${paragraphIndex}-${lineIndex}`}
                            >
                              {line}
                              {lineIndex < paragraph.length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                      )
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-end pt-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={16} />
                      <span>{commentCounts[activePost.id] ?? 0}</span>
                    </div>
                  </div>

                  <DeferredComments
                    key={activePost.id}
                    containerId={`twikoo-life-${activePost.id}`}
                    path={`/life/${activePost.id}`}
                    observerRootRef={contentRef}
                    rootMargin="0px"
                    layout="stacked"
                    onCommentLoaded={handleLifeCommentLoaded}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
