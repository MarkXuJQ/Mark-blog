import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, MessageCircle, X, ListFilter, ChevronDown, ArrowDown } from 'lucide-react'
import { Seo } from '../components/seo/Seo'
import { DeferredComments } from '../components/comments/DeferredComments'
import { Dropdown, DropdownContent, DropdownTrigger } from '../components/ui/Dropdown'
import { useLightbox } from '../components/ui/Lightbox'
import { getImageUrl } from '../utils/image'
import { cn } from '../utils/cn'

type ImageInput = string | { src: string; alt?: string }

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
  images: string[]
}

const lifeYearFiles = import.meta.glob<{ default: RawLifePost[] }>(
  '@content/life/*.json',
  { eager: true }
)

function normalizeImageSrc(input: ImageInput): string {
  const src = typeof input === 'string' ? input : input.src
  const trimmed = src.trim().replace(/[)）]+$/, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return getImageUrl(trimmed)
}

function parseCityFromMeta(meta: string): string | undefined {
  const parts = meta.split('·').map((p) => p.trim()).filter(Boolean)
  const maybe = parts[1]
  return maybe ? maybe : undefined
}

async function ensureTwikooLoaded(): Promise<void> {
  if (typeof window === 'undefined') return
  if (window.twikoo) return

  await new Promise<void>((resolve) => {
    const existing = document.getElementById('twikoo-script') as HTMLScriptElement | null
    if (existing) {
      if (window.twikoo) resolve()
      else existing.addEventListener('load', () => resolve(), { once: true })
      return
    }

    const cdnScript = document.createElement('script')
    cdnScript.src = 'https://registry.npmmirror.com/twikoo/1.7.0/files/dist/twikoo.min.js'
    cdnScript.async = true
    cdnScript.id = 'twikoo-script'
    cdnScript.crossOrigin = 'anonymous'
    cdnScript.addEventListener('load', () => resolve(), { once: true })
    document.body.appendChild(cdnScript)
  })
}

export function Life() {
  const { t } = useTranslation()
  const title = t('nav.life')
  const description = t('life.description', '生活随笔瀑布流。')
  const { openLightbox } = useLightbox()
  const twikooEnvId = import.meta.env.VITE_TWIKOO_ENV_ID || 'https://comments.markxu.icu/api/twikoo'

  const posts = useMemo(() => {
    const merged = Object.values(lifeYearFiles).flatMap((module) => module.default ?? [])
    const normalized: LifePost[] = merged
      .map((post) => {
        const rawImages = Array.isArray(post.images) ? post.images : post.image ? [post.image] : []
        const images = rawImages.map(normalizeImageSrc)
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
    return Object.keys(selectedCities).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  }, [selectedCities])

  const displayPosts = useMemo(() => {
    const hasCityFilter = selectedCityList.length > 0
    const filtered = hasCityFilter
      ? posts.filter((p) => p.city && selectedCities[p.city])
      : posts

    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.date).getTime()
      const bTime = new Date(b.date).getTime()
      if (aTime === bTime) return a.id.localeCompare(b.id)
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime
    })

    return sorted
  }, [posts, selectedCities, selectedCityList.length, sortOrder])

  const [activeId, setActiveId] = useState<string | null>(null)
  const activePost = useMemo(
    () => posts.find((p) => p.id === activeId) ?? null,
    [activeId, posts]
  )
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const activeImages = useMemo(() => activePost?.images ?? [], [activePost])
  const contentRef = useRef<HTMLDivElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const failedImagesRef = useRef<Set<string>>(new Set())
  const [, forceRerender] = useState(0)

  const refreshCommentCounts = async (postIds?: string[]) => {
    if (typeof window === 'undefined') return
    if (!twikooEnvId) return
    if (window.__PRERENDER__) return
    if (posts.length === 0) return
    try {
      await ensureTwikooLoaded()
      if (!window.twikoo?.getCommentsCount) return
      const ids = postIds && postIds.length > 0 ? postIds : posts.map((p) => p.id)
      const urls = ids.map((id) => `/life/${id}`)
      const res = await window.twikoo.getCommentsCount({
        envId: twikooEnvId,
        urls,
        includeReply: false,
      })
      const next: Record<string, number> = {}
      for (const item of res) {
        if (!item?.url) continue
        const id = item.url.startsWith('/life/') ? item.url.slice('/life/'.length) : item.url
        next[id] = typeof item.count === 'number' ? item.count : 0
      }
      setCommentCounts((prev) => ({ ...prev, ...next }))
    } catch {
      return
    }
  }

  useEffect(() => {
    refreshCommentCounts()
  }, [posts, twikooEnvId])

  useEffect(() => {
    if (!activeId) return
    setActiveImageIndex(0)
  }, [activeId])

  useEffect(() => {
    if (!activePost) return
    if (activeImages.length === 0) return
    const next = activeImages[(activeImageIndex + 1) % activeImages.length]
    const prev = activeImages[(activeImageIndex - 1 + activeImages.length) % activeImages.length]
    for (const src of [next, prev]) {
      if (!src) continue
      const img = new Image()
      img.src = src
    }
  }, [activePost, activeImages, activeImageIndex])

  const goPrevImage = () => {
    if (activeImages.length <= 1) return
    setActiveImageIndex((prev) => (prev === 0 ? activeImages.length - 1 : prev - 1))
  }

  const goNextImage = () => {
    if (activeImages.length <= 1) return
    setActiveImageIndex((prev) => (prev === activeImages.length - 1 ? 0 : prev + 1))
  }

  useEffect(() => {
    if (!activeId) return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (e.key === 'Escape') setActiveId(null)
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrevImage()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNextImage()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeId])

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
      const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 1

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    window.dispatchEvent(new CustomEvent('app:overlay', { detail: { open: true } }))

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

      window.dispatchEvent(new CustomEvent('app:overlay', { detail: { open: false } }))
    }
  }, [activeId])

  return (
    <>
      <Seo title={title} description={description} />

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className={cn(
                'btn-secondary flex cursor-pointer items-center justify-center gap-2 select-none active:scale-95'
              )}
            >
              <ArrowDown
                size={16}
                className={cn(sortOrder === 'desc' ? 'rotate-0 text-blue-500' : 'rotate-180 text-green-500', 'transition-transform')}
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
                          selectedCityList.length > 2 ? ` +${selectedCityList.length - 2}` : ''
                        }`}
                  </span>
                  <ChevronDown size={14} />
                </DropdownTrigger>

                <DropdownContent align="start" className="w-64 p-2">
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
                            'hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedCities({})}
                      className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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

        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {displayPosts.map((post) => (
            <motion.div
              key={post.id}
              className={cn(
                'group relative mb-4 inline-block w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm',
                'text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700',
                'focus-within:ring-2 focus-within:ring-blue-500/60',
                'break-inside-avoid'
              )}
            >
                <button
                  type="button"
                  onClick={() => setActiveId(post.id)}
                  className="block w-full text-left focus:outline-none"
                  aria-label={`打开：${post.title}`}
                >
                <motion.div
                  layoutId={`life-image-${post.id}`}
                  className="relative min-h-[160px] w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  {failedCoverIds[post.id] ? (
                    <div className="flex min-h-[160px] w-full items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      图片加载失败
                    </div>
                  ) : (
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                      onError={() =>
                        setFailedCoverIds((prev) => ({ ...prev, [post.id]: true }))
                      }
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />

                  {post.images.length > 1 && (
                    <div className="absolute top-2 right-2 rounded-full bg-black/45 px-2 py-1 text-[11px] text-white/90 backdrop-blur">
                      {post.images.length}
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3 text-xs text-white/90">
                    <div>{post.date}</div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={14} />
                      <span>{commentCounts[post.id] ?? 0}</span>
                    </div>
                  </div>
                </motion.div>

                <div className="p-3">
                  <div className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {post.title}
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
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              onClick={() => setActiveId(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              className={cn(
                'relative z-[1001] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl',
                'dark:border-slate-800 dark:bg-slate-950'
              )}
            >
              <div className="flex max-h-[85vh] flex-col md:flex-row">
                <div className="relative shrink-0 bg-black md:w-[66%]">
                  <motion.div
                    layoutId={`life-image-${activePost.id}`}
                    className="relative group isolate overflow-hidden"
                  >
                    {!failedImagesRef.current.has(
                      activeImages[activeImageIndex] ?? activeImages[0]
                    ) && (
                      <img
                        src={activeImages[activeImageIndex] ?? activeImages[0]}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2] object-cover opacity-30 blur-2xl brightness-90"
                        loading="eager"
                        decoding="async"
                        draggable={false}
                      />
                    )}
                    <div className="relative z-10">
                      {failedImagesRef.current.has(
                        activeImages[activeImageIndex] ?? activeImages[0]
                      ) ? (
                        <div className="flex h-[42vh] w-full flex-col items-center justify-center gap-3 text-slate-200 md:h-[85vh]">
                          <div className="text-sm">图片加载失败</div>
                          <button
                            type="button"
                            onClick={() => {
                              const src = activeImages[activeImageIndex] ?? activeImages[0]
                              if (src) failedImagesRef.current.delete(src)
                              forceRerender((x) => x + 1)
                            }}
                            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/15"
                          >
                            重新加载
                          </button>
                        </div>
                      ) : (
                        <img
                          src={activeImages[activeImageIndex] ?? activeImages[0]}
                          alt={activePost.title}
                          className="h-[42vh] w-full select-none object-contain md:h-[85vh]"
                          loading="eager"
                          decoding="async"
                          draggable={false}
                          onError={() => {
                            const src = activeImages[activeImageIndex] ?? activeImages[0]
                            if (!src) return
                            failedImagesRef.current.add(src)
                            forceRerender((x) => x + 1)
                          }}
                        />
                      )}

                      {activeImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={goPrevImage}
                            className="absolute inset-y-0 left-0 w-[10%] cursor-w-resize focus:outline-none"
                            aria-label="上一张"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              openLightbox(
                                activeImages.map((img) => ({
                                  src: img,
                                  alt: activePost.title,
                                  description: activePost.meta,
                                })),
                                activeImageIndex
                              )
                            }
                            className="absolute inset-y-0 left-[10%] w-[80%] cursor-zoom-in focus:outline-none"
                            aria-label="打开灯箱"
                          />
                          <button
                            type="button"
                            onClick={goNextImage}
                            className="absolute inset-y-0 right-0 w-[10%] cursor-e-resize focus:outline-none"
                            aria-label="下一张"
                          />

                          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/80">
                            <ChevronLeft size={18} />
                          </div>
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">
                            <ChevronRight size={18} />
                          </div>

                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-1 text-xs text-white/90 backdrop-blur">
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
                                src: img,
                                alt: activePost.title,
                                description: activePost.meta,
                              })),
                              activeImageIndex
                            )
                          }
                          className="absolute inset-0 cursor-zoom-in focus:outline-none"
                          aria-label="打开灯箱"
                        />
                      )}
                    </div>
                  </motion.div>

                  {activeImages.length > 1 && (
                    <div className="absolute bottom-3 left-3 right-3 z-[20] flex gap-2 overflow-x-auto rounded-xl bg-black/25 p-2 backdrop-blur">
                      {activeImages.map((src, idx) => (
                        <button
                          key={`${src}-${idx}`}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={cn(
                            'relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border',
                            idx === activeImageIndex
                              ? 'border-white/70'
                              : 'border-white/15 opacity-80 hover:opacity-100'
                          )}
                          aria-label={`切换到第 ${idx + 1} 张`}
                        >
                          <img
                            src={src}
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
                    onClick={() => setActiveId(null)}
                    className={cn(
                      'absolute top-3 right-3 z-[20] inline-flex h-10 w-10 items-center justify-center rounded-full',
                      'bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/55',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                    )}
                    aria-label="关闭弹层"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div
                  ref={contentRef}
                  className="flex flex-1 flex-col overflow-y-scroll overscroll-contain p-5 md:p-6"
                >
                  <div className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {activePost.title}
                  </div>
                  <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    {activePost.meta}
                  </div>

                  <div className="mb-6 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                    {activePost.content}
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
                    rootMargin="400px 0px"
                    layout="stacked"
                    onCommentLoaded={() => {
                      if (commentCountsRefreshTimerRef.current) {
                        window.clearTimeout(commentCountsRefreshTimerRef.current)
                      }
                      commentCountsRefreshTimerRef.current = window.setTimeout(() => {
                        refreshCommentCounts([activePost.id])
                      }, 250)
                    }}
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
