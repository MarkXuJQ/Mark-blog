import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clapperboard, Star, X } from 'lucide-react'
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
type Opened = { id: string; byReader: boolean }
type ShelfGroup = { id: string; label: string; movies: CsvMovieItem[] }

const UNDATED_GROUP = 'undated'

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
  const hintId = `${baseId}-hint`

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
  const doubanLinkRef = useRef<HTMLAnchorElement>(null)
  const hoveredRef = useRef<string | null>(null)
  const openedRef = useRef<Opened | null>(null)
  const interactedRef = useRef(false)
  const lastFocusedRef = useRef<string | null>(null)
  const settleTimers = useRef(new Map<string, number>())

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
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  // The shelf only has room for volumes with a real TMDB poster. Entries still
  // being fetched are counted separately so the shelf can show a small hint.
  const posterMovies = useMemo(
    () => movies.filter((movie) => Boolean(tmdbMap[movie.id]?.posterUrl)),
    [movies, tmdbMap]
  )
  const pendingCount = useMemo(
    () =>
      movies.filter(
        (movie) => !Object.prototype.hasOwnProperty.call(tmdbMap, movie.id)
      ).length,
    [movies, tmdbMap]
  )

  const groups = useMemo<ShelfGroup[]>(() => {
    const buckets = new Map<string, CsvMovieItem[]>()
    for (const movie of posterMovies) {
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
        movies: bucketMovies,
      }))
  }, [posterMovies, monthLabel])

  const allMovies = useMemo(
    () => groups.flatMap((group) => group.movies),
    [groups]
  )

  const rest = useCallback((id: string) => {
    const button = buttons.current.get(id)
    if (!button) return
    button.style.setProperty('--rx', '0deg')
    button.style.setProperty('--ry', '0deg')
    button.style.setProperty('--lift', '0')
  }, [])

  const lean = useCallback((id: string, at: Point) => {
    const button = buttons.current.get(id)
    if (!button) return
    const x = Math.min(1, Math.max(0, at.x))
    const y = Math.min(1, Math.max(0, at.y))
    button.style.setProperty('--rx', `${((y - 0.5) * 2 * 11).toFixed(2)}deg`)
    button.style.setProperty('--ry', `${(-(x - 0.5) * 2 * 15).toFixed(2)}deg`)
    button.style.setProperty('--lift', '1')
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
          }, reduced ? 0 : 560)
        )
      }
    },
    [reduced, rest]
  )

  const close = useCallback((byReader = false) => {
    const current = openedRef.current
    if (!current) return
    if (byReader && current.byReader) {
      const id = lastFocusedRef.current
      window.setTimeout(() => {
        buttons.current.get(id ?? '')?.focus({ preventScroll: true })
      }, 0)
    }
    openedRef.current = null
    setOpened(null)
  }, [])

  const open = useCallback(
    (movie: CsvMovieItem, byReader: boolean) => {
      if (openedRef.current?.id === movie.id) return
      if (byReader) lastFocusedRef.current = movie.id
      const next: Opened = { id: movie.id, byReader }
      openedRef.current = next
      setOpened(next)
      hover(null)
    },
    [hover]
  )

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
    if (!opened?.byReader) return
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [opened?.id, opened?.byReader])

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
        const movie = posterMovies.find((item) => item.id === pick)
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
  }, [mounted, visible, reduced, allMovies, posterMovies, hover, lean, open, close, take])

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
      doubanLinkRef.current,
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
    <div ref={rootRef} className="movie-shelf">
      <div className="movie-shelf__intro">
        <h2 className="movie-shelf__intro-title">{t('movies.shelf.title')}</h2>
        <p className="movie-shelf__hint">{t('movies.shelf.hint')}</p>
      </div>
      <p id={hintId} className="sr-only">
        {t('movies.shelf.hint')}
      </p>

      {posterMovies.length === 0 ? (
        <p className="movie-shelf__empty">
          {pendingCount > 0
            ? t('movies.shelf.loading', { count: pendingCount })
            : t('movies.shelf.noPosters')}
        </p>
      ) : null}

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
                    aria-describedby={hintId}
                    data-pose={hovered === movie.id ? 'tilt' : 'rest'}
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
                    <span className="movie-shelf__volume" aria-hidden="true">
                      <span className="movie-shelf__cover">
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
                            <Clapperboard
                              size={18}
                              className="movie-shelf__fallback-icon"
                            />
                            <span className="movie-shelf__fallback-title">
                              {movie.title}
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
                      <span className="movie-shelf__paper movie-shelf__paper--top" />
                      <span className="movie-shelf__pages" />
                      <span className="movie-shelf__paper movie-shelf__paper--bottom" />
                      <span className="movie-shelf__spine" />
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
                  className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.22 }}
                >
                  <div
                    className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
                    onClick={() => close(true)}
                    aria-hidden="true"
                  />
                  <motion.div
                    role="dialog"
                    aria-modal={opened?.byReader || undefined}
                    aria-labelledby={`${baseId}-panel-title`}
                    className="relative z-10 grid max-h-[88vh] w-full max-w-3xl grid-cols-1 gap-6 overflow-y-auto rounded-[1.8rem] border border-slate-200/80 bg-[var(--surface-card)] p-5 shadow-2xl sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:p-6 dark:border-[#2b2f36]"
                    style={{ perspective: '1200px' }}
                    initial={reduced ? undefined : { opacity: 0, scale: 0.96, rotateY: -10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={reduced ? undefined : { opacity: 0, scale: 0.97, rotateY: 6 }}
                    transition={{ duration: reduced ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
                    onKeyDown={onPanelKey}
                  >
                    <motion.div
                      className="relative mx-auto aspect-[2/3] w-full max-w-[15rem] overflow-hidden rounded-xl bg-slate-900 shadow-xl"
                      initial={reduced ? undefined : { rotateY: -22 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {openedTmdb?.posterUrl ? (
                        <img
                          src={openedTmdb.posterUrl}
                          alt={openedMovie.title}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(78,152,186,0.35),transparent_60%),linear-gradient(150deg,#1f2937,#0b1017)] text-slate-200">
                          <Clapperboard size={28} />
                          <span className="px-4 text-center text-sm">
                            {t('movies.tmdb.noPoster')}
                          </span>
                        </div>
                      )}
                      <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-sm font-semibold tracking-wide text-white/90">
                        {starText(openedMovie.rating)}
                      </span>
                    </motion.div>

                    <div className="flex min-w-0 flex-col">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.16em] text-amber-600 uppercase dark:text-amber-300">
                          {monthLabel(monthKeyOf(openedMovie))}
                        </span>
                        <button
                          ref={closeButtonRef}
                          type="button"
                          aria-label={t('movies.shelf.close')}
                          onClick={() => close(true)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <h2
                        id={`${baseId}-panel-title`}
                        className="text-2xl leading-tight font-semibold text-slate-900 dark:text-slate-50"
                      >
                        {openedMovie.title}
                      </h2>
                      {openedMovie.originalTitle ? (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {openedMovie.originalTitle}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 text-amber-500">
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
                          <span className="ml-1 text-slate-500 dark:text-slate-400">
                            {openedMovie.rating === null
                              ? '--'
                              : t('movies.rating.value', { rating: openedMovie.rating })}
                          </span>
                        </span>
                        <span>
                          {t('movies.watchDate')}:{' '}
                          {formatMovieDate(openedMovie.watchDate, locale) || '--'}
                        </span>
                        {openedMovie.platform ? (
                          <span>{openedMovie.platform}</span>
                        ) : null}
                      </div>

                      {(openedMovie.reviewSummary || openedMovie.note).trim() ? (
                        <p className="mt-5 border-l-2 border-[var(--brand-400)]/50 pl-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {(openedMovie.reviewSummary || openedMovie.note).trim()}
                        </p>
                      ) : null}

                      <div className="mt-auto flex flex-wrap gap-2 pt-6">
                        {openedMovie.reviewSlug ? (
                          <Link
                            ref={reviewLinkRef}
                            to={`/movies/reviews/${encodeURIComponent(openedMovie.reviewSlug)}`}
                            className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            onClick={() => close(false)}
                          >
                            {t('movies.shelf.openReview')}
                          </Link>
                        ) : null}
                        {openedMovie.link ? (
                          <a
                            ref={doubanLinkRef}
                            href={openedMovie.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 text-sm text-slate-600 transition hover:border-[var(--brand-400)] hover:text-[var(--brand-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] dark:border-[#363b43] dark:text-slate-300 dark:hover:text-white"
                          >
                            <RiDoubanLine size={15} />
                            {t('movies.actions.openDouban')}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
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
