import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Maximize2, Minimize2, Tags, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import type { BlogPostSummary } from '@/lib/content/posts'
import {
  buildTagCloud,
  MAX_TAG_CLOUD_TAGS,
  type TagCloudItem,
} from '@/lib/content/tagCloud'
import { cn } from '@/lib/classNames'
import { widgetCardClass } from '@/lib/styles'
import '@/assets/styles/tag-cloud.css'

interface TagCloudWidgetProps {
  posts: BlogPostSummary[]
  selectedTag: string | null
  onToggleTag: (tag: string) => void
}

// Static class strings so Tailwind can detect every level.
const LEVEL_CLASSES = [
  'text-[0.7rem] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  'text-xs font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10',
  'text-sm font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10',
  'text-[0.95rem] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10',
  'text-[1.05rem] font-bold text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10',
]

const EXPANDED_LEVEL_CLASSES = [
  'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  'text-sky-600 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10',
  'text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10',
  'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10',
  'text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10',
]

const CLOUD_WIDTH = 900
const CLOUD_HEIGHT = 600
const CLOUD_FONT_SIZES = [13, 16, 20, 26, 32]
const CLOUD_RINGS = 20
const LENS_RADIUS = 180
const LENS_SHIFT_PX = 4
const PREVIEW_CLOSE_DELAY = 180
const MAX_COOCCURRENCE_LINKS = 8
const CJK_CHARACTER = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u

interface CloudBox {
  x: number
  y: number
  width: number
  height: number
}

interface ExpandedCloudWord {
  item: TagCloudItem
  left: number
  top: number
  xOffset: number
  yOffset: number
  delay: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getLensEase(value: number) {
  const clamped = clamp(value, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

function resetCloudWordLens(node: HTMLButtonElement) {
  node.style.removeProperty('--cloud-word-scale')
  node.style.removeProperty('--cloud-word-x')
  node.style.removeProperty('--cloud-word-y')
  node.style.removeProperty('--cloud-word-opacity')
  node.style.removeProperty('--cloud-word-saturation')
  node.style.removeProperty('--cloud-word-z')
}

function approximateWordWidth(label: string, fontSize: number) {
  let units = 0
  for (const char of label) {
    if (/\s/u.test(char)) units += 0.32
    else if (CJK_CHARACTER.test(char)) units += 1
    else units += 0.58
  }
  return Math.max(units * fontSize, fontSize * 1.4)
}

function overlapArea(a: CloudBox, b: CloudBox) {
  const overlapX =
    Math.min(a.x + a.width / 2, b.x + b.width / 2) -
    Math.max(a.x - a.width / 2, b.x - b.width / 2)
  const overlapY =
    Math.min(a.y + a.height / 2, b.y + b.height / 2) -
    Math.max(a.y - a.height / 2, b.y - b.height / 2)

  return overlapX > 0 && overlapY > 0 ? overlapX * overlapY : 0
}

function buildExpandedLayout(
  items: TagCloudItem[],
  density = 100
): ExpandedCloudWord[] {
  const centerX = CLOUD_WIDTH / 2
  const centerY = CLOUD_HEIGHT / 2
  const placed: CloudBox[] = []
  const result: ExpandedCloudWord[] = []

  items.forEach((item, index) => {
    const fontSize = CLOUD_FONT_SIZES[item.level - 1] ?? CLOUD_FONT_SIZES[0]
    const box = {
      width: approximateWordWidth(item.label, fontSize) + 14,
      height: fontSize * 1.4 + 12,
    }

    let freeSpot: CloudBox | null = null
    let bestOverlappingSpot: CloudBox | null = null
    let bestOverlap = Number.POSITIVE_INFINITY

    search: for (let ring = 0; ring <= CLOUD_RINGS; ring += 1) {
      const radiusX = (ring / CLOUD_RINGS) * (centerX - 36)
      const radiusY = (ring / CLOUD_RINGS) * (centerY - 30)
      const samples = ring === 0 ? 1 : Math.max(16, ring * 6)

      for (let sample = 0; sample < samples; sample += 1) {
        const angle = (sample / samples) * Math.PI * 2 + ring * 0.31
        const candidate = {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
          ...box,
        }

        if (
          candidate.x - candidate.width / 2 < 8 ||
          candidate.x + candidate.width / 2 > CLOUD_WIDTH - 8 ||
          candidate.y - candidate.height / 2 < 8 ||
          candidate.y + candidate.height / 2 > CLOUD_HEIGHT - 8
        ) {
          continue
        }

        const overlap = placed.reduce(
          (total, other) => total + overlapArea(candidate, other),
          0
        )

        if (overlap < 0.01) {
          freeSpot = candidate
          break search
        }

        if (overlap < bestOverlap) {
          bestOverlap = overlap
          bestOverlappingSpot = candidate
        }
      }
    }

    const spot = freeSpot ??
      bestOverlappingSpot ?? { x: centerX, y: centerY, ...box }
    placed.push(spot)

    result.push({
      item,
      left: (spot.x / CLOUD_WIDTH) * 100,
      top: (spot.y / CLOUD_HEIGHT) * 100,
      // cqw keeps the outward animation proportional to the scaled canvas.
      xOffset: ((spot.x - centerX) / CLOUD_WIDTH) * 100,
      yOffset: ((spot.y - centerY) / CLOUD_WIDTH) * 100,
      delay: Math.min(index * 10, 320),
    })
  })

  // Push the packed cloud outward so the enlarged view actually fills the canvas.
  const fitsCanvas = (factor: number) =>
    placed.every((box) => {
      const x = centerX + (box.x - centerX) * factor
      const y = centerY + (box.y - centerY) * factor
      return (
        x - box.width / 2 >= 8 &&
        x + box.width / 2 <= CLOUD_WIDTH - 8 &&
        y - box.height / 2 >= 8 &&
        y + box.height / 2 <= CLOUD_HEIGHT - 8
      )
    })

  let maxSpread = 1.5
  while (!fitsCanvas(maxSpread) && maxSpread > 1) maxSpread -= 0.05

  // density 0 = packed around the center, 100 = fill the canvas.
  const spread = 1 + (clamp(density, 0, 100) / 100) * Math.max(0, maxSpread - 1)

  if (spread <= 1.001) return result

  return result.map((word, index) => {
    const box = placed[index]
    const x = centerX + (box.x - centerX) * spread
    const y = centerY + (box.y - centerY) * spread

    return {
      ...word,
      left: (x / CLOUD_WIDTH) * 100,
      top: (y / CLOUD_HEIGHT) * 100,
      xOffset: ((x - centerX) / CLOUD_WIDTH) * 100,
      yOffset: ((y - centerY) / CLOUD_WIDTH) * 100,
    }
  })
}

function getPostHref(post: BlogPostSummary) {
  return post.movieSubjectId
    ? `/movies/reviews/${encodeURIComponent(post.slug)}`
    : `/blog/${post.slug}`
}

function formatPostDate(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date

  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

export function TagCloudWidget({
  posts,
  selectedTag,
  onToggleTag,
}: TagCloudWidgetProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [activePreviewKey, setActivePreviewKey] = useState<string | null>(null)
  const [focusedWordKey, setFocusedWordKey] = useState<string | null>(null)
  const [selectedWordKey, setSelectedWordKey] = useState<string | null>(null)
  const [density, setDensity] = useState(100)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const wordRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [previewPlacement, setPreviewPlacement] = useState<{
    left: number
    top: number
    maxHeight: number
    arrowLeft: number
    above: boolean
  } | null>(null)
  const items = useMemo(() => buildTagCloud(posts), [posts])
  const baseWords = useMemo(
    () => buildExpandedLayout(items, density),
    [items, density]
  )
  const postsByTag = useMemo(() => {
    const map = new Map<string, BlogPostSummary[]>()
    for (const post of posts) {
      for (const rawTag of post.tags ?? []) {
        const key = rawTag.trim().toLowerCase()
        if (!key) continue
        const bucket = map.get(key)
        if (bucket) bucket.push(post)
        else map.set(key, [post])
      }
    }
    for (const bucket of map.values()) {
      bucket.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    }
    return map
  }, [posts])
  const tagCoOccurrences = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const post of posts) {
      const keys = [
        ...new Set(
          (post.tags ?? [])
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
        ),
      ]
      for (const key of keys) {
        let related = map.get(key)
        if (!related) {
          related = new Map<string, number>()
          map.set(key, related)
        }
        for (const other of keys) {
          if (other === key) continue
          related.set(other, (related.get(other) ?? 0) + 1)
        }
      }
    }
    return map
  }, [posts])
  const expandedWords = baseWords

  const updateWordLens = useCallback((x: number, y: number) => {
    Object.values(wordRefs.current).forEach((node) => {
      if (!node) return

      const rect = node.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = centerX - x
      const deltaY = centerY - y
      const distance = Math.hypot(deltaX, deltaY)
      const influence = getLensEase(1 - distance / LENS_RADIUS)
      const isActive =
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

      if (influence <= 0.01 && !isActive) {
        resetCloudWordLens(node)
        return
      }

      const directionX = distance > 0 ? deltaX / distance : 0
      const directionY = distance > 0 ? deltaY / distance : -1
      const activeBoost = isActive ? 1 : 0
      const shift = influence * LENS_SHIFT_PX

      node.style.setProperty(
        '--cloud-word-scale',
        (1 + influence * 0.1 + activeBoost * 0.035).toFixed(3)
      )
      node.style.setProperty(
        '--cloud-word-x',
        `${(directionX * shift).toFixed(2)}px`
      )
      node.style.setProperty(
        '--cloud-word-y',
        `${(directionY * shift - activeBoost * 0.5).toFixed(2)}px`
      )
      node.style.setProperty(
        '--cloud-word-opacity',
        (0.96 + influence * 0.04).toFixed(3)
      )
      node.style.setProperty(
        '--cloud-word-saturation',
        (1 + influence * 0.08).toFixed(3)
      )
      node.style.setProperty(
        '--cloud-word-z',
        String(Math.round(1 + influence * 10 + activeBoost * 10))
      )
    })
  }, [])

  const resetWordLens = useCallback(() => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    Object.values(wordRefs.current).forEach((node) => {
      if (node) resetCloudWordLens(node)
    })
  }, [])

  const cancelPreviewClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const schedulePreviewClose = useCallback(() => {
    cancelPreviewClose()
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setActivePreviewKey(null)
    }, PREVIEW_CLOSE_DELAY)
  }, [cancelPreviewClose])

  const registerWord = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) wordRefs.current[key] = node
      else delete wordRefs.current[key]
    },
    []
  )

  const measurePreviewPlacement = useCallback(() => {
    const canvas = canvasRef.current
    const preview = previewRef.current
    const word = activePreviewKey ? wordRefs.current[activePreviewKey] : null
    const layoutWord = activePreviewKey
      ? expandedWords.find((item) => item.item.key === activePreviewKey)
      : undefined

    if (!canvas || !preview || !word || !layoutWord) {
      setPreviewPlacement(null)
      return
    }

    const canvasRect = canvas.getBoundingClientRect()
    // Measure against the target layout instead of the transitioning rect, so
    // the popup and the word move to the new position together.
    const wordCenterX =
      canvasRect.left + (layoutWord.left / 100) * canvasRect.width
    const wordTop =
      canvasRect.top +
      (layoutWord.top / 100) * canvasRect.height -
      word.offsetHeight / 2
    const edge = 12
    const gap = 10
    const wordBottom = wordTop + word.offsetHeight
    const roomAbove = wordTop - gap - edge
    const roomBelow = window.innerHeight - wordBottom - gap - edge
    // Use whichever side has more room, so short popups no longer get squeezed
    // into a scrollable sliver when the word sits near the top of the viewport.
    const preferAbove = roomAbove >= roomBelow
    const maxHeight = Math.min(640, Math.max(120, preferAbove ? roomAbove : roomBelow))

    // Set before measuring so the rect reflects the height we will actually use.
    preview.style.maxHeight = `${maxHeight}px`

    // offsetWidth/Height ignore the tooltip entrance transform, so placement
    // stays accurate while the animation is still running.
    const previewWidth = preview.offsetWidth
    const previewHeight = preview.offsetHeight
    const maxLeft = Math.max(edge, window.innerWidth - previewWidth - edge)
    const left = clamp(wordCenterX - previewWidth / 2, edge, maxLeft)
    const maxTop = Math.max(edge, window.innerHeight - previewHeight - edge)
    const desiredTop = preferAbove
      ? wordTop - gap - previewHeight
      : wordBottom + gap
    const top = clamp(desiredTop, edge, maxTop)

    setPreviewPlacement({
      left,
      top,
      maxHeight,
      arrowLeft: clamp(wordCenterX - left, 14, Math.max(14, previewWidth - 14)),
      above: top + previewHeight <= wordTop,
    })
  }, [activePreviewKey, expandedWords])

  useLayoutEffect(() => {
    measurePreviewPlacement()
  }, [activePreviewKey, isExpanded, measurePreviewPlacement])

  useEffect(() => {
    if (!isExpanded || !activePreviewKey) return
    window.addEventListener('resize', measurePreviewPlacement)
    return () => window.removeEventListener('resize', measurePreviewPlacement)
  }, [activePreviewKey, isExpanded, measurePreviewPlacement])

  useEffect(() => {
    if (!isExpanded) return

    const triggerElement = triggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() =>
      closeRef.current?.focus()
    )

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      triggerElement?.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (activePreviewKey) setActivePreviewKey(null)
      else setIsExpanded(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, activePreviewKey])

  useEffect(
    () => () => {
      if (frameRef.current != null)
        window.cancelAnimationFrame(frameRef.current)
      if (closeTimerRef.current != null)
        window.clearTimeout(closeTimerRef.current)
      Object.values(wordRefs.current).forEach((node) => {
        if (node) resetCloudWordLens(node)
      })
    },
    []
  )

  const effectiveFocusKey =
    focusedWordKey ?? selectedWordKey ?? activePreviewKey
  const focusedWord = effectiveFocusKey
    ? expandedWords.find((word) => word.item.key === effectiveFocusKey)
    : undefined
  const relatedCounts = useMemo(() => {
    if (!effectiveFocusKey) return new Map<string, number>()
    const row = tagCoOccurrences.get(effectiveFocusKey)
    if (!row) return new Map<string, number>()

    const sorted = [...row.entries()].sort((a, b) => b[1] - a[1])
    const maxCount = sorted[0]?.[1] ?? 0
    const threshold = Math.max(1, Math.ceil(maxCount * 0.35))
    return new Map(
      sorted
        .filter(([, count]) => count >= threshold)
        .slice(0, MAX_COOCCURRENCE_LINKS)
    )
  }, [effectiveFocusKey, tagCoOccurrences])
  const maxRelatedCount = Math.max(1, ...relatedCounts.values())
  const relatedLinks = focusedWord
    ? expandedWords
        .filter((word) => relatedCounts.has(word.item.key))
        .map((word) => ({
          word,
          strength: (relatedCounts.get(word.item.key) ?? 0) / maxRelatedCount,
        }))
    : []

  if (items.length === 0) return null

  const visibleItems = items.slice(0, MAX_TAG_CLOUD_TAGS)
  const hiddenCount = items.length - visibleItems.length
  const postUnit = t('blog.sidebar.tagCloud.postUnit')
  const title = t('blog.sidebar.tagCloud.title')
  const activeWord = activePreviewKey
    ? expandedWords.find((word) => word.item.key === activePreviewKey)
    : undefined
  const activePosts = activeWord
    ? (postsByTag.get(activeWord.item.key) ?? [])
    : []

  const closeCloud = () => {
    cancelPreviewClose()
    setActivePreviewKey(null)
    setFocusedWordKey(null)
    setSelectedWordKey(null)
    resetWordLens()
    setIsExpanded(false)
  }

  const openCloud = () => {
    cancelPreviewClose()
    setActivePreviewKey(null)
    setFocusedWordKey(null)
    setSelectedWordKey(null)
    setIsExpanded(true)
  }

  const closePreview = () => {
    cancelPreviewClose()
    setActivePreviewKey(null)
  }

  const handleCanvasPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === 'touch') return

    if (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !window.matchMedia('(pointer: coarse)').matches
    ) {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      if (frameRef.current == null) {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null
          updateWordLens(pointerRef.current.x, pointerRef.current.y)
        })
      }
    }

    if (activePreviewKey) {
      const target = event.target as HTMLElement
      if (
        target.closest('[data-cloud-word][data-active]') ||
        target.closest('[data-cloud-preview]')
      ) {
        cancelPreviewClose()
      } else {
        schedulePreviewClose()
      }
    }
  }

  const handleCanvasPointerLeave = () => {
    resetWordLens()
    setFocusedWordKey(null)
    schedulePreviewClose()
  }

  const handleWordFocus = (node: HTMLButtonElement) => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return
    }
    const rect = node.getBoundingClientRect()
    updateWordLens(rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const target = event.target as HTMLElement
    if (
      target.closest('[data-cloud-word]') ||
      target.closest('[data-cloud-preview]')
    ) {
      return
    }
    closePreview()
    setSelectedWordKey(null)
    setFocusedWordKey(null)
  }

  const expandedDialog =
    typeof document === 'undefined' || !isExpanded
      ? null
      : createPortal(
          <div className="fixed inset-0 z-[3000]">
            <button
              type="button"
              className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm dark:bg-black/65"
              aria-label={t('blog.sidebar.tagCloud.collapse')}
              tabIndex={-1}
              onClick={closeCloud}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tag-cloud-expanded-title"
              className="absolute top-1/2 left-1/2 flex max-h-[92vh] w-[min(96vw,900px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl dark:border-[#2b2f36] dark:bg-[#17191c]"
            >
              <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2b2f36]">
                <div className="min-w-0 flex-1">
                  <h2
                    id="tag-cloud-expanded-title"
                    className="font-round text-base font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {t('blog.sidebar.tagCloud.hint')}
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold text-slate-400 tabular-nums dark:text-slate-500">
                  {items.length}
                </span>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label={t('blog.sidebar.tagCloud.collapse')}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-current/40 focus-visible:outline-none dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  onClick={closeCloud}
                >
                  <Minimize2 size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="flex justify-center overflow-auto px-3 py-5 sm:px-6">
                <div
                  ref={canvasRef}
                  className="tag-cloud-expanded__canvas w-full max-w-[860px] min-w-[640px]"
                  onPointerMove={handleCanvasPointerMove}
                  onPointerLeave={handleCanvasPointerLeave}
                  onPointerCancel={handleCanvasPointerLeave}
                  onPointerDown={handleCanvasPointerDown}
                >
                  {focusedWord && relatedLinks.length > 0 ? (
                    <svg
                      className="tag-cloud-expanded__links"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {relatedLinks.map(({ word, strength }) => (
                        <line
                          key={word.item.key}
                          className="tag-cloud-expanded__link"
                          x1={focusedWord.left}
                          y1={focusedWord.top}
                          x2={word.left}
                          y2={word.top}
                          strokeOpacity={0.1 + strength * 0.32}
                        />
                      ))}
                    </svg>
                  ) : null}

                  {expandedWords.map((word) => {
                    const isActive = activePreviewKey === word.item.key
                    const isSelected =
                      selectedWordKey === word.item.key ||
                      selectedTag?.trim().toLowerCase() === word.item.key
                    const wordStyle = {
                      left: `${word.left}%`,
                      top: `${word.top}%`,
                      '--tag-cloud-x': `${word.xOffset}cqw`,
                      '--tag-cloud-y': `${word.yOffset}cqw`,
                      '--tag-cloud-delay': `${word.delay}ms`,
                    } as CSSProperties

                    return (
                      <button
                        key={word.item.key}
                        ref={(node) => registerWord(word.item.key, node)}
                        type="button"
                        data-level={word.item.level}
                        data-cloud-word=""
                        data-active={isActive ? 'true' : undefined}
                        data-selected={isSelected ? 'true' : undefined}
                        data-related={
                          relatedCounts.has(word.item.key) ? 'true' : undefined
                        }
                        data-dimmed={
                          effectiveFocusKey &&
                          word.item.key !== effectiveFocusKey &&
                          !relatedCounts.has(word.item.key)
                            ? 'true'
                            : undefined
                        }
                        style={wordStyle}
                        aria-expanded={isActive}
                        aria-label={t('blog.sidebar.tagCloud.previewByTag', {
                          tag: word.item.label,
                        })}
                        title={`${word.item.label} · ${word.item.count} ${postUnit}`}
                        className={cn(
                          styles.expandedWord,
                          EXPANDED_LEVEL_CLASSES[word.item.level - 1] ??
                            EXPANDED_LEVEL_CLASSES[0]
                        )}
                        onFocus={(event) => {
                          setFocusedWordKey(word.item.key)
                          setSelectedWordKey(word.item.key)
                          handleWordFocus(event.currentTarget)
                        }}
                        onBlur={() => {
                          setFocusedWordKey(null)
                          resetWordLens()
                        }}
                        onPointerEnter={() => {
                          setFocusedWordKey(word.item.key)
                          cancelPreviewClose()
                        }}
                        onPointerLeave={() => {
                          setFocusedWordKey(null)
                          if (isActive) schedulePreviewClose()
                        }}
                        onClick={() => {
                          setSelectedWordKey(word.item.key)
                          cancelPreviewClose()
                          setActivePreviewKey((current) =>
                            current === word.item.key ? null : word.item.key
                          )
                        }}
                      >
                        <span className="tag-cloud-expanded__word-face">
                          {word.item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex shrink-0 justify-end border-t border-slate-100 px-5 py-3 dark:border-[#2b2f36]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={density}
                  aria-label={t('blog.sidebar.tagCloud.density')}
                  onChange={(event) => setDensity(Number(event.target.value))}
                  className="h-4 w-40 cursor-pointer accent-[var(--brand-600)] sm:h-1"
                />
              </div>
            </div>
          </div>,
          document.body
        )

  const expandedPreview =
    typeof document === 'undefined' || !isExpanded || !activeWord
      ? null
      : createPortal(
          <div
            className={styles.previewAnchor}
            data-placement={previewPlacement?.above ? 'above' : 'below'}
            style={
              {
                left: previewPlacement
                  ? `${previewPlacement.left}px`
                  : undefined,
                top: previewPlacement ? `${previewPlacement.top}px` : undefined,
                visibility: previewPlacement ? 'visible' : 'hidden',
                '--preview-arrow-left': previewPlacement
                  ? `${previewPlacement.arrowLeft}px`
                  : '50%',
              } as CSSProperties
            }
          >
            <div
              ref={previewRef}
              data-cloud-preview=""
              role="group"
              aria-label={t('blog.sidebar.tagCloud.relatedPosts')}
              className={styles.preview}
              style={
                {
                  maxHeight: previewPlacement?.maxHeight,
                } as CSSProperties
              }
              onPointerEnter={cancelPreviewClose}
              onPointerLeave={schedulePreviewClose}
            >
              <button
                type="button"
                aria-label={t('blog.sidebar.tagCloud.closePreview')}
                className={styles.previewClose}
                onClick={closePreview}
              >
                <X size={14} aria-hidden="true" />
              </button>

              <div className={styles.previewBody}>
                <span className={styles.previewName}>
                  #{activeWord.item.label}
                </span>
                <span className={styles.previewUrl}>
                  {activePosts.length} {postUnit}
                </span>

                <div className={styles.previewList}>
                  {activePosts.map((post) => (
                    <Link
                      key={`${post.slug}-${post.date}`}
                      to={getPostHref(post)}
                      className={styles.previewComment}
                    >
                      <time
                        dateTime={post.date}
                        className={styles.previewCommentDate}
                      >
                        {formatPostDate(post.date)}
                      </time>
                      <span className={styles.previewCommentText}>
                        {post.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )

  return (
    <Card
      as="aside"
      className={widgetCardClass}
      aria-labelledby="tag-cloud-title"
    >
      <div className={styles.header}>
        <Tags size={19} className="text-fuchsia-500" aria-hidden="true" />
        <h3 id="tag-cloud-title" className={styles.title}>
          {title}
        </h3>
        <span className={styles.total}>{items.length}</span>
        <button
          ref={triggerRef}
          type="button"
          aria-label={t('blog.sidebar.tagCloud.expand')}
          aria-expanded={isExpanded}
          className={styles.expandButton}
          onClick={openCloud}
        >
          <Maximize2 size={14} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.cloud}>
        {visibleItems.map((tag) => {
          const isSelected = selectedTag?.trim().toLowerCase() === tag.key
          return (
            <button
              key={tag.key}
              type="button"
              aria-pressed={isSelected}
              aria-label={t('blog.archive.filterByTag', { tag: tag.label })}
              title={`${tag.label} · ${tag.count} ${postUnit}`}
              className={cn(
                styles.tag,
                LEVEL_CLASSES[tag.level - 1] ?? LEVEL_CLASSES[0],
                isSelected && styles.tagSelected
              )}
              onClick={() => onToggleTag(tag.label)}
            >
              {tag.label}
            </button>
          )
        })}
      </div>

      {hiddenCount > 0 ? (
        <p className={styles.more}>
          {t('blog.sidebar.tagCloud.more', { count: hiddenCount })}
        </p>
      ) : null}

      {expandedDialog}
      {expandedPreview}
    </Card>
  )
}

const styles = {
  header:
    'mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800',
  title: 'font-round font-medium text-slate-800 dark:text-slate-100',
  total:
    'ml-auto px-0.5 text-[11px] font-semibold tabular-nums text-slate-400 dark:text-slate-500',
  expandButton:
    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300',
  cloud: 'font-round flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5',
  tag: 'cursor-pointer rounded-md border-0 bg-transparent px-0.5 py-0.5 leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50',
  tagSelected: 'bg-slate-900/[0.08] dark:bg-white/10',
  expandedWord:
    'tag-cloud-expanded__word cursor-pointer rounded-md border-0 bg-transparent font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50',
  previewAnchor: 'tag-cloud-expanded__preview-anchor',
  preview:
    'tag-cloud-expanded__preview friend-link-tooltip relative rounded-xl border border-slate-200/70 bg-white/95 p-3 text-[var(--text-primary)] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 dark:border-0 dark:bg-[#17191c] dark:shadow-none dark:ring-white/5',
  previewClose:
    'absolute top-2 right-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200',
  // Reserve the close-button space on the two header lines only. Padding the
  // whole body would stop every gray post row 20px short of the popup edge.
  previewBody: 'flex min-w-0 flex-col gap-1',
  previewName:
    'font-round block pr-6 text-[15px] font-semibold leading-5 text-slate-900 dark:text-slate-100',
  previewUrl:
    'block truncate pr-6 font-mono text-[11px] leading-4 text-slate-400 dark:text-slate-500',
  previewList: 'mt-1 space-y-1.5',
  previewComment:
    'block rounded-md bg-slate-100/80 px-2 py-1.5 text-xs leading-5 text-[var(--text-primary)] transition-colors hover:bg-slate-200/80 dark:bg-[#23262b]/70 dark:hover:bg-[#2b2f36]',
  previewCommentDate:
    'block font-mono text-[10px] leading-4 text-slate-400 dark:text-slate-500',
  previewCommentText: 'block min-w-0 break-words',
  more: 'mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500',
}
