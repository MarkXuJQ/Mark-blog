import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star, X } from 'lucide-react'
import { RiDoubanLine } from 'react-icons/ri'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/classNames'
import { formatMovieDate } from '@/lib/movies/movieUtils'
import type {
  CsvMovieItem,
  TmdbEnrichedMovie,
} from '@/lib/movies/movieTypes'
import '@/assets/styles/movie-shelf.css'

type Point = { x: number; y: number }
type Phase = 'opening' | 'open' | 'closing'
type Opened = { id: string; phase: Phase; byReader: boolean }
type ShelfGroup = { id: string; label: string; movies: CsvMovieItem[] }

const UNDATED_GROUP = 'undated'

/** Damped spring, sampled into a CSS linear() easing. From the reference shelf. */
function spring(damping: number, duration: number) {
  const a = 1 - damping
  const omega = (2 * Math.PI * 1000) / duration
  const at = (t: number) => {
    if (a >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t)
    const w = omega * Math.sqrt(1 - a * a)
    return (
      1 -
      Math.exp(-a * omega * t) *
        (Math.cos(w * t) + ((a * omega) / w) * Math.sin(w * t))
    )
  }
  let settle = 0
  for (let t = 0; t < 3; t += 0.002) {
    if (Math.abs(1 - at(t)) > 0.001) settle = t
  }
  const points = Array.from({ length: 41 }, (_, index) =>
    index === 40 ? 1 : Math.round(at((index / 40) * settle) * 1e4) / 1e4
  )
  return {
    easing: `linear(${points.join(', ')})`,
    duration: Math.round(settle * 1000),
  }
}

const BACK = spring(0.3, 560)
const FLIGHT = spring(0.14, 520)
const ROOT_VARS = {
  '--spring': BACK.easing,
  '--spring-ms': `${BACK.duration}ms`,
  '--lift': 0.26,
} as CSSProperties

const easingOf = ({ easing }: { easing: string }) =>
  typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', easing)
    ? easing
    : 'cubic-bezier(0.2, 0.8, 0.2, 1)'

function monthKeyOf(movie: CsvMovieItem): string {
  return /^\d{4}-\d{2}/.test(movie.watchDate)
    ? movie.watchDate.slice(0, 7)
    : UNDATED_GROUP
}

function starText(rating: number | null) {
  if (rating === null) return '☆☆☆☆☆'
  return `${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}`
}

interface MovieShelfProps {
  movies: CsvMovieItem[]
  tmdbMap: Record<string, TmdbEnrichedMovie | null>
  locale: string
}

export function MovieShelf({ movies, tmdbMap, locale }: MovieShelfProps) {
  const { t } = useTranslation()
  const reduced = usePrefersReducedMotion()
  const baseId = useId().replace(/[^\w-]/g, '')

  const monthLabel = useCallback(
    (key: string) => {
      if (key === UNDATED_GROUP) return t('movies.shelf.groups.undated')
      const [year, month] = key.split('-').map(Number)
      if (!year || !month) return key
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, month - 1, 1)))
    },
    [locale, t]
  )

  const rootRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<SVGSVGElement>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const reviewLinkRef = useRef<HTMLAnchorElement>(null)
  const entryLinkRef = useRef<HTMLAnchorElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)
  const leafRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const discRef = useRef<HTMLSpanElement>(null)
  const discDragRef = useRef<{ id: number; x: number; rotation: number } | null>(null)
  const discRotationRef = useRef(0)
  const hoveredRef = useRef<string | null>(null)
  const openedRef = useRef<Opened | null>(null)
  const interactedRef = useRef(false)
  const lastFocusedRef = useRef<string | null>(null)
  const settleTimers = useRef(new Map<string, number>())
  const departureRef = useRef<DOMRect | null>(null)
  const interruptedRef = useRef<string | null>(null)
  const interruptedLeafRef = useRef<string | null>(null)
  const runningAnimations = useRef(new Set<Animation>())

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [settling, setSettling] = useState<ReadonlySet<string>>(() => new Set())
  const [opened, setOpened] = useState<Opened | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [ghostTarget, setGhostTarget] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRERENDER__) return
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = rootRef.current
    if (!root) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 }
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [mounted])

  useEffect(() => {
    const timers = settleTimers.current
    const animations = runningAnimations.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      animations.forEach((animation) => animation.cancel())
    }
  }, [])

  const hasPoster = useCallback(
    (movie: CsvMovieItem) => Boolean(tmdbMap[movie.id]?.posterUrl),
    [tmdbMap]
  )

  const groups = useMemo<ShelfGroup[]>(() => {
    const buckets = new Map<string, CsvMovieItem[]>()
    for (const movie of movies) {
      const key = monthKeyOf(movie)
      const bucket = buckets.get(key) ?? []
      bucket.push(movie)
      buckets.set(key, bucket)
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => {
        if (a === UNDATED_GROUP) return 1
        if (b === UNDATED_GROUP) return -1
        return b.localeCompare(a)
      })
      .map(([id, bucketMovies]) => ({
        id,
        label: monthLabel(id),
        // Text-only spines go to the end of the month, keeping watch-date order.
        movies: [...bucketMovies].sort(
          (a, b) => Number(!hasPoster(a)) - Number(!hasPoster(b))
        ),
      }))
  }, [movies, monthLabel, hasPoster])

  const allMovies = useMemo(
    () => groups.flatMap((group) => group.movies),
    [groups]
  )

  const seen = useCallback((element: Element | null) => {
    if (
      !element ||
      !element.getAnimations().some((animation) => animation.playState === 'running')
    ) {
      return null
    }
    return getComputedStyle(element).transform
  }, [])

  const play = useCallback(
    (
      element: Element | null,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions
    ) => {
      if (!element) return null
      const animation = element.animate(keyframes, options)
      runningAnimations.current.add(animation)
      const forget = () => runningAnimations.current.delete(animation)
      animation.finished.then(forget, forget)
      return animation
    },
    []
  )

  const allDone = useCallback(
    (animations: (Animation | null)[]) =>
      Promise.all(animations.map((animation) => animation?.finished)).then(
        () => true,
        () => false
      ),
    []
  )

  const scaleOf = useCallback(() => {
    const element = rootRef.current
    return element
      ? element.getBoundingClientRect().width / element.offsetWidth || 1
      : 1
  }, [])

  const rest = useCallback((id: string) => {
    const button = buttons.current.get(id)
    if (!button) return
    button.style.setProperty('--rx', '0deg')
    button.style.setProperty('--ry', '0deg')
  }, [])

  const lean = useCallback((id: string, at: Point) => {
    const button = buttons.current.get(id)
    if (!button) return
    const x = Math.min(1, Math.max(0, at.x))
    const y = Math.min(1, Math.max(0, at.y))
    button.style.setProperty('--rx', `${((y - 0.5) * 2 * 11).toFixed(2)}deg`)
    button.style.setProperty('--ry', `${(-(x - 0.5) * 2 * 15).toFixed(2)}deg`)
  }, [])

  const hover = useCallback(
    (id: string | null) => {
      const before = hoveredRef.current
      if (before === id) return
      hoveredRef.current = id
      setHovered(id)
      setSettling((current) => {
        const next = new Set(current)
        if (before) next.add(before)
        if (id) next.delete(id)
        return next
      })

      if (id) {
        window.clearTimeout(settleTimers.current.get(id))
        settleTimers.current.delete(id)
      }
      if (before) {
        rest(before)
        window.clearTimeout(settleTimers.current.get(before))
        settleTimers.current.set(
          before,
          window.setTimeout(() => {
            settleTimers.current.delete(before)
            setSettling((current) => {
              const next = new Set(current)
              next.delete(before)
              return next
            })
          }, reduced ? 0 : BACK.duration + 80)
        )
      }
    },
    [reduced, rest]
  )

  const close = useCallback(
    (byReader = false) => {
      const current = openedRef.current
      if (!current || current.phase === 'closing') return
      if (!byReader && current.byReader) return
      if (byReader || panelRef.current?.contains(document.activeElement)) {
        lastFocusedRef.current = current.id
      }
      if (reduced) {
        openedRef.current = null
        setOpened(null)
        return
      }
      interruptedRef.current = seen(flyerRef.current)
      interruptedLeafRef.current = seen(leafRef.current)
      runningAnimations.current.forEach((animation) => animation.cancel())
      const next: Opened = { ...current, phase: 'closing' }
      openedRef.current = next
      setOpened(next)
    },
    [reduced, seen]
  )

  const open = useCallback(
    (movie: CsvMovieItem, byReader: boolean) => {
      const current = openedRef.current
      if (current?.byReader || (current && !byReader)) return
      if (current?.id === movie.id && current.phase !== 'closing') {
        const next: Opened = { ...current, byReader }
        openedRef.current = next
        setOpened(next)
        return
      }
      runningAnimations.current.forEach((animation) => animation.cancel())
      const cover = buttons.current.get(movie.id)?.querySelector('[data-cover]')
      departureRef.current = cover ? cover.getBoundingClientRect() : null
      interruptedRef.current = null
      interruptedLeafRef.current = null
      discDragRef.current = null
      discRotationRef.current = 0
      if (byReader) lastFocusedRef.current = movie.id
      const next: Opened = {
        id: movie.id,
        phase: reduced ? 'open' : 'opening',
        byReader,
      }
      openedRef.current = next
      setOpened(next)
      hover(null)
    },
    [hover, reduced]
  )

  const claimPanel = useCallback(() => {
    const current = openedRef.current
    if (!current || current.byReader) return
    const next: Opened = { ...current, byReader: true }
    openedRef.current = next
    setOpened(next)
  }, [])

  const onDiscPointerDown = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      discDragRef.current = {
        id: event.pointerId,
        x: event.clientX,
        rotation: discRotationRef.current,
      }
    },
    []
  )

  const onDiscPointerMove = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      const drag = discDragRef.current
      if (!drag || drag.id !== event.pointerId) return
      const rotation = drag.rotation - (event.clientX - drag.x) * 0.55
      discRotationRef.current = rotation
      discRef.current?.style.setProperty('--disc-rotation', `${rotation}deg`)
    },
    []
  )

  const onDiscPointerUp = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      if (discDragRef.current?.id !== event.pointerId) return
      discDragRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    []
  )

  const playOpening = useCallback(() => {
    const element = flyerRef.current
    const current = openedRef.current
    if (!element || !current) return
    const from = departureRef.current
    const box = slotRef.current?.getBoundingClientRect()
    if (!box) return
    const scale = scaleOf()
    const animations = [
      play(panelRef.current, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 120,
        easing: 'ease-out',
      }),
      from
        ? play(
            element,
            [
              {
                transform: `translate(${(from.left - box.left) / scale}px, ${(from.top - box.top) / scale}px) scale(${from.width / box.width})`,
              },
              { transform: 'none' },
            ],
            { duration: FLIGHT.duration, easing: easingOf(FLIGHT) }
          )
        : null,
      play(
        leafRef.current,
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-155deg)' }],
        {
          duration: FLIGHT.duration,
          delay: 80,
          easing: easingOf(FLIGHT),
          fill: 'backwards',
        }
      ),
    ]
    allDone(animations).then((done) => {
      const later = openedRef.current
      if (!done || later?.id !== current.id || later.phase !== 'opening') return
      const next: Opened = { ...later, phase: 'open' }
      openedRef.current = next
      setOpened(next)
    })
  }, [allDone, play, scaleOf])

  const playClosing = useCallback(() => {
    const current = openedRef.current
    const cover = current
      ? buttons.current.get(current.id)?.querySelector('[data-cover]')
      : null
    if (!current) return
    const box = slotRef.current?.getBoundingClientRect()
    if (!box) return
    const scale = scaleOf()
    const to = cover?.getBoundingClientRect()
    const animations = [
      play(
        panelRef.current,
        [
          { opacity: 1, offset: 0 },
          { opacity: 1, offset: 0.86 },
          { opacity: 0, offset: 1 },
        ],
        { duration: FLIGHT.duration, delay: 100, easing: 'ease-in', fill: 'forwards' }
      ),
      to
        ? play(
            flyerRef.current,
            [
              { transform: interruptedRef.current ?? 'none' },
              {
                transform: `translate(${(to.left - box.left) / scale}px, ${(to.top - box.top) / scale}px) scale(${to.width / box.width})`,
              },
            ],
            {
              duration: FLIGHT.duration,
              delay: 100,
              easing: easingOf(FLIGHT),
              fill: 'forwards',
            }
          )
        : play(flyerRef.current, [{ opacity: 1 }, { opacity: 0 }], {
            duration: 220,
            fill: 'forwards',
          }),
      play(
        leafRef.current,
        [
          { transform: interruptedLeafRef.current ?? 'rotateY(-155deg)' },
          { transform: 'rotateY(0deg)' },
        ],
        { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
      ),
    ]
    allDone(animations).then((done) => {
      if (!done || openedRef.current?.id !== current.id) return
      openedRef.current = null
      setOpened(null)
      const id = lastFocusedRef.current
      buttons.current.get(id ?? '')?.focus({ preventScroll: true })
    })
  }, [allDone, play, scaleOf])

  useLayoutEffect(() => {
    if (opened?.phase === 'opening') playOpening()
    else if (opened?.phase === 'closing') playClosing()
  }, [opened?.phase, opened?.id, playOpening, playClosing])

  const take = useCallback(() => {
    interactedRef.current = true
    setGhostTarget(null)
    if (pointerRef.current) pointerRef.current.dataset.visible = 'false'
    if (openedRef.current && !openedRef.current.byReader) close()
  }, [close])

  useEffect(() => {
    if (
      openedRef.current &&
      !movies.some((movie) => movie.id === openedRef.current?.id)
    ) {
      close()
    }
  }, [movies, close])

  useEffect(() => {
    if (!opened?.byReader || opened.phase === 'closing') return
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [opened?.id, opened?.byReader, opened?.phase])

  // The ghost pointer is a one-off demo: it stops permanently on the first
  // real input, and never runs during prerender or with reduced motion.
  useEffect(() => {
    if (!mounted || !visible || reduced || allMovies.length === 0) return
    const ids = allMovies.slice(0, 3).map((movie) => movie.id)
    const stage = rootRef.current
    if (!stage) return

    let cancelled = false
    const timers: number[] = []
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms))
      })

    const moveTo = (id: string, at: Point) => {
      const button = buttons.current.get(id)
      const arrow = pointerRef.current
      if (!button || !arrow) return
      const box = button.getBoundingClientRect()
      const bounds = stage.getBoundingClientRect()
      arrow.style.transform = `translate3d(${(box.left - bounds.left + box.width * at.x - 5).toFixed(1)}px, ${(box.top - bounds.top + box.height * at.y - 4).toFixed(1)}px, 0)`
      arrow.dataset.visible = 'true'
      setGhostTarget(id)
      hover(id)
      lean(id, at)
    }

    const stop = () => {
      cancelled = true
      take()
    }
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('keydown', stop)
    window.addEventListener('scroll', stop, { passive: true })

    const run = async () => {
      await wait(1400)
      const path: Point[] = [
        { x: 0.28, y: 0.72 },
        { x: 0.76, y: 0.3 },
        { x: 0.55, y: 0.62 },
      ]
      while (!cancelled) {
        for (const [index, id] of ids.entries()) {
          if (cancelled) return
          moveTo(id, path[index % path.length])
          await wait(950)
        }
        if (cancelled) return
        const pick = ids[ids.length - 1]
        const movie = movies.find((item) => item.id === pick)
        if (movie) open(movie, false)
        await wait(1600)
        if (cancelled) return
        close()
        setGhostTarget(null)
        hover(null)
        if (pointerRef.current) pointerRef.current.dataset.visible = 'false'
        await wait(2800)
      }
    }
    void run()

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('scroll', stop)
    }
  }, [mounted, visible, reduced, allMovies, movies, hover, lean, open, close, take])

  const tabStop = allMovies.some((movie) => movie.id === focusId)
    ? focusId
    : (allMovies[0]?.id ?? null)

  const onBookKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = allMovies.findIndex((movie) => movie.id === id)
    let next = index
    if (event.key === 'ArrowRight') next = index + 1
    else if (event.key === 'ArrowLeft') next = index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = allMovies.length - 1
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const boxes = allMovies.map(
        (movie) => buttons.current.get(movie.id)?.getBoundingClientRect()
      )
      const here = boxes[index]
      if (!here) return
      const down = event.key === 'ArrowDown'
      let best = -1
      let bestScore = Infinity
      boxes.forEach((box, i) => {
        if (!box) return
        const gap = down ? box.top - here.bottom : here.top - box.bottom
        if (gap < 0) return
        const score =
          gap * 4 + Math.abs(box.left + box.width / 2 - (here.left + here.width / 2))
        if (score < bestScore) {
          bestScore = score
          best = i
        }
      })
      if (best < 0) return
      next = best
    } else return

    event.preventDefault()
    take()
    const target = allMovies[Math.min(allMovies.length - 1, Math.max(0, next))]
    if (target) buttons.current.get(target.id)?.focus()
  }

  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
      return
    }
    if (event.key !== 'Tab') return
    const stops = [
      closeButtonRef.current,
      reviewLinkRef.current,
      entryLinkRef.current,
    ].filter(
      (element): element is HTMLButtonElement | HTMLAnchorElement =>
        Boolean(element)
    )
    if (!stops.length) return
    const at = stops.indexOf(
      document.activeElement as HTMLButtonElement | HTMLAnchorElement
    )
    event.preventDefault()
    stops[(at + (event.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus()
  }

  const openedMovie = opened
    ? (movies.find((movie) => movie.id === opened.id) ?? null)
    : null
  const openedTmdb = openedMovie ? (tmdbMap[openedMovie.id] ?? null) : null

  return (
    <div
      ref={rootRef}
      className="movie-shelf"
      style={ROOT_VARS}
      inert={Boolean(opened?.byReader && opened.phase !== 'closing')}
    >
      {groups.map((group) => (
        <section
          key={group.id}
          className="movie-shelf__group"
          aria-labelledby={`${baseId}-${group.id}`}
        >
          <div className="movie-shelf__group-head">
            <h3
              id={`${baseId}-${group.id}`}
              className="movie-shelf__group-title"
            >
              {group.label}
            </h3>
            <span className="movie-shelf__group-count">
              {group.movies.length}
            </span>
          </div>
          <ul className="movie-shelf__grid" aria-label={group.label}>
            {group.movies.map((movie) => {
              const solid = hovered === movie.id || settling.has(movie.id)
              const tmdb = tmdbMap[movie.id] ?? null
              const poster = tmdb?.posterUrl
              return (
                <li
                  key={movie.id}
                  className="movie-shelf__slot"
                  data-awake={solid || undefined}
                >
                  <button
                    ref={(element) => {
                      if (element) buttons.current.set(movie.id, element)
                      else buttons.current.delete(movie.id)
                    }}
                    type="button"
                    className="movie-shelf__book"
                    aria-label={`${movie.title}. ${starText(movie.rating)}`}
                    data-pose={hovered === movie.id ? 'tilt' : 'rest'}
                    data-open={opened?.id === movie.id || undefined}
                    tabIndex={tabStop === movie.id ? 0 : -1}
                    onClick={() => {
                      take()
                      open(movie, true)
                    }}
                    onPointerEnter={(event: PointerEvent<HTMLButtonElement>) => {
                      if (event.pointerType === 'touch') return
                      take()
                      hover(movie.id)
                      lean(movie.id, shareOf(event))
                    }}
                    onPointerMove={(event: PointerEvent<HTMLButtonElement>) => {
                      if (event.pointerType === 'touch' || !mounted) return
                      lean(movie.id, shareOf(event))
                    }}
                    onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
                      if (event.pointerType === 'touch') return
                      hover(null)
                    }}
                    onFocus={(event) => {
                      setFocusId(movie.id)
                      if (!event.currentTarget.matches(':focus-visible')) return
                      take()
                      hover(movie.id)
                      lean(movie.id, { x: 0.5, y: 0.5 })
                    }}
                    onBlur={() => hover(null)}
                    onKeyDown={(event) => onBookKey(event, movie.id)}
                  >
                    <span className="movie-shelf__shadow" aria-hidden="true" />
                    <span
                      className="movie-shelf__volume"
                      data-solid={solid || undefined}
                      aria-hidden="true"
                    >
                      <span className="movie-shelf__cover" data-cover="">
                        {poster ? (
                          <img
                            src={poster}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            draggable={false}
                          />
                        ) : (
                          <span className="movie-shelf__fallback">
                            <span className="movie-shelf__fallback-label">
                              {t('movies.shelf.textCover')}
                            </span>
                            <span className="movie-shelf__fallback-title">
                              {movie.title}
                            </span>
                            {movie.originalTitle ? (
                              <span className="movie-shelf__fallback-original">
                                {movie.originalTitle}
                              </span>
                            ) : null}
                            <span className="movie-shelf__fallback-rating">
                              {starText(movie.rating)}
                            </span>
                          </span>
                        )}
                        <span className="movie-shelf__cover-shade" />
                        <span className="movie-shelf__cover-info">
                          <span className="movie-shelf__cover-title">
                            {movie.title}
                          </span>
                          <span className="movie-shelf__cover-stars">
                            {starText(movie.rating)}
                          </span>
                          {movie.reviewSlug ? (
                            <span className="movie-shelf__cover-badge">
                              {t('movies.reviews.hasReviewBadge')}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {solid ? (
                        <>
                          <span className="movie-shelf__edge" />
                          <span className="movie-shelf__top" />
                          <span className="movie-shelf__bottom" />
                        </>
                      ) : null}
                    </span>
                  </button>
                  <span className="movie-shelf__caption" title={movie.title}>
                    {movie.title}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <svg
        ref={pointerRef}
        className="movie-shelf__ghost"
        data-visible={ghostTarget ? 'true' : 'false'}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M4 2.7 19.1 12l-7 1.4-3.4 6.6L4 2.7Z"
          fill="var(--text-primary)"
          stroke="var(--surface-0)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>

      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence initial={false}>
              {openedMovie ? (
                <motion.div
                  key="movie-shelf-panel"
                  className="fixed inset-0 z-[120] overflow-y-auto"
                >
                  <motion.div
                    className="fixed inset-0 bg-slate-950/55 backdrop-blur-[3px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.22 }}
                    onClick={() => close(true)}
                    aria-hidden="true"
                  />
                  <div
                    role="presentation"
                    className="relative flex min-h-full items-center justify-center p-4 sm:p-6"
                    onPointerDownCapture={claimPanel}
                    onFocusCapture={claimPanel}
                  >
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog owns Esc/Tab handling */}
                    <div
                      ref={panelRef}
                      role="dialog"
                      aria-modal={opened?.byReader || undefined}
                      aria-labelledby={`${baseId}-panel-title`}
                      data-phase={opened?.phase}
                      className="movie-shelf__dialog"
                      onKeyDown={onPanelKey}
                    >
                      <div ref={flyerRef} className="movie-shelf__spread">
                        <div ref={leafRef} className="movie-shelf__leaf" aria-hidden="true">
                          <div className="movie-shelf__leaf-face movie-shelf__leaf-front">
                            {openedTmdb?.posterUrl ? (
                              <img
                                src={openedTmdb.posterUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="movie-shelf__fallback">
                                <span className="movie-shelf__fallback-label">
                                  {t('movies.shelf.textCover')}
                                </span>
                                <span className="movie-shelf__fallback-title">
                                  {openedMovie.title}
                                </span>
                                <span className="movie-shelf__fallback-rating">
                                  {starText(openedMovie.rating)}
                                </span>
                              </span>
                            )}
                            <span className="movie-shelf__cover-shade" />
                          </div>
                          <div className="movie-shelf__leaf-face movie-shelf__leaf-inside">
                            <span
                              ref={discRef}
                              className="movie-shelf__disc"
                              onPointerDown={onDiscPointerDown}
                              onPointerMove={onDiscPointerMove}
                              onPointerUp={onDiscPointerUp}
                              onPointerCancel={onDiscPointerUp}
                            >
                              <span className="movie-shelf__disc-face">
                                {openedTmdb?.posterUrl ? (
                                  <span className="movie-shelf__disc-label">
                                    <img
                                      src={openedTmdb.posterUrl}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                    />
                                  </span>
                                ) : (
                                  <span className="movie-shelf__disc-label movie-shelf__disc-label--laser" />
                                )}
                              </span>
                              <span className="movie-shelf__disc-shine" />
                            </span>
                            <span className="movie-shelf__inside-title">
                              {openedMovie.title}
                            </span>
                          </div>
                        </div>

                        <div ref={slotRef} className="movie-shelf__panel-page">
                          <div className="flex items-start justify-between gap-2">
                            <span className="hidden text-[0.62rem] font-medium tracking-[0.18em] text-slate-400 uppercase sm:inline dark:text-slate-500">
                              {t('movies.shelf.detailLabel')}
                            </span>
                            <button
                              ref={closeButtonRef}
                              type="button"
                              aria-label={t('movies.shelf.close')}
                              onClick={() => close(true)}
                              className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white sm:h-9 sm:w-9"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <h2
                            id={`${baseId}-panel-title`}
                            className="text-sm leading-snug font-semibold break-words text-slate-900 dark:text-slate-50 sm:text-2xl sm:leading-tight"
                          >
                            {openedMovie.title}
                          </h2>
                          {openedMovie.originalTitle ? (
                            <p className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
                              {openedMovie.originalTitle}
                            </p>
                          ) : null}

                          <div className="movie-shelf__panel-meta flex flex-col gap-1 text-xs text-slate-600 sm:gap-2 sm:text-sm dark:text-slate-300">
                            <span
                              role="img"
                              aria-label={
                                openedMovie.rating === null
                                  ? starText(null)
                                  : t('movies.rating.value', { rating: openedMovie.rating })
                              }
                              className="inline-flex items-center gap-1 text-amber-500 sm:gap-1.5"
                            >
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={index}
                                  size={14}
                                  className={cn(
                                    openedMovie.rating !== null &&
                                      index < openedMovie.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  )}
                                />
                              ))}
                              <span className="hidden text-slate-500 sm:inline dark:text-slate-400">
                                {openedMovie.rating === null
                                  ? '--'
                                  : t('movies.rating.value', { rating: openedMovie.rating })}
                              </span>
                            </span>
                            <span>
                              <span className="hidden sm:inline">
                                {t('movies.watchDate')}:{' '}
                              </span>
                              {formatMovieDate(openedMovie.watchDate, locale) || '--'}
                            </span>
                            {openedTmdb?.releaseDate &&
                            openedTmdb.releaseDate.slice(0, 10) !== openedMovie.watchDate ? (
                              <span className="hidden sm:inline">
                                {t('movies.releaseDate')}:{' '}
                                {formatMovieDate(openedTmdb.releaseDate, locale)}
                              </span>
                            ) : null}
                            {openedMovie.platform &&
                            !/^(douban|豆瓣)$/i.test(openedMovie.platform.trim()) ? (
                              <span className="hidden sm:inline">
                                {openedMovie.platform}
                              </span>
                            ) : null}
                          </div>

                          {(openedMovie.reviewSummary || openedMovie.note).trim() ? (
                            <p className="movie-shelf__panel-note hidden border-l-2 border-[var(--brand-400)]/50 pl-3 text-sm leading-7 text-slate-600 sm:block dark:text-slate-300">
                              {(openedMovie.reviewSummary || openedMovie.note).trim()}
                            </p>
                          ) : null}

                          {openedMovie.reviewSlug || openedMovie.link ? (
                            <div className="mt-auto flex flex-wrap gap-1.5 pt-2 sm:gap-2 sm:pt-6">
                              {openedMovie.reviewSlug ? (
                                <Link
                                  ref={reviewLinkRef}
                                  to={`/movies/reviews/${encodeURIComponent(openedMovie.reviewSlug)}`}
                                  className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:h-10 sm:px-4 sm:text-sm"
                                  onClick={() => close(false)}
                                >
                                  {t('movies.shelf.openReview')}
                                </Link>
                              ) : null}
                              {openedMovie.link ? (
                                <a
                                  ref={entryLinkRef}
                                  href={openedMovie.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-slate-200 px-3 text-xs text-slate-600 transition hover:border-[var(--brand-400)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] dark:border-[#363b43] dark:text-slate-300 dark:hover:text-white sm:h-10 sm:gap-1.5 sm:px-4 sm:text-sm"
                                >
                                  <RiDoubanLine size={15} />
                                  {t('movies.shelf.openEntry')}
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  )
}

function shareOf(event: PointerEvent<HTMLElement>): Point {
  const box = event.currentTarget.getBoundingClientRect()
  return {
    x: (event.clientX - box.left) / box.width,
    y: (event.clientY - box.top) / box.height,
  }
}
