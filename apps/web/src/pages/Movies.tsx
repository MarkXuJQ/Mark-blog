import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Clapperboard, Search, Star } from 'lucide-react'
import { RiDoubanLine } from 'react-icons/ri'
import { MovieGuestbook } from '@/components/movies/MovieGuestbook'
import { MovieStatsPanel } from '@/components/movies/MovieStatsPanel'
import { Seo } from '@/components/seo/Seo'
import { Pagination } from '@/components/ui/Pagination'
import { RevealText } from '@/components/ui/reveal-text'
import { WatchActivityCalendar } from '@/components/movies/WatchActivityCalendar'
import { getMovieReviewBySlug, getMovieReviewBySubjectId } from '@/lib/content'
import { cn } from '@/lib/utils'
import movieCsvRaw from '@content/movies/movie.csv?raw'
import movieOverridesRaw from '@content/movies/movie-overrides.json'

type ViewMode = 'csv' | 'tmdb'
type CardLayout = 'list' | 'grid'
type TmdbStatus = 'idle' | 'loading' | 'ready' | 'error'

interface MovieOverride {
  platform?: string
  note?: string
  tmdbId?: number | string
  tmdbQuery?: string
  reviewSlug?: string
}

interface CsvMovieItem {
  id: string
  subjectId: string
  title: string
  originalTitle: string
  link: string
  watchDate: string
  rating: number | null
  platform: string
  note: string
  tmdbId: number | null
  tmdbQuery: string
  reviewSlug: string
  reviewSummary: string
}

interface TmdbSearchMovie {
  id: number
  title?: string
  original_title?: string
  poster_path?: string | null
  release_date?: string
}

interface TmdbEnrichedMovie {
  tmdbId: number
  tmdbTitle: string
  tmdbOriginalTitle: string
  posterUrl: string
  releaseDate: string
}

const ROWS_PER_PAGE = 4
const BASE_COLUMNS = 2
const MIN_CARD_WIDTH_MD = 190
const MIN_CARD_WIDTH_LG = 210
const GAP_MD = 12
const GAP_LG = 16
const DEFAULT_PLATFORM = 'Douban'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const DOUBAN_PROFILE_URL =
  'https://www.douban.com/people/191287070/?_i=3746089pLWPXRI,3746152pLWPXRI'
const TMDB_PROFILE_URL = 'https://www.themoviedb.org/u/MarkXu269'
const CINEMA_REVEAL_TEXT = 'CINEMA'
const CINEMA_STILL_IMAGES = [
  '/images/movies/cinema/interstellar.jpg',
  '/images/movies/cinema/walter-mitty.jpg',
  '/images/movies/cinema/city-the-animation.jpg',
  '/images/movies/cinema/wandering-earth-2.jpg',
  '/images/movies/cinema/midnight-in-paris.jpg',
  '/images/movies/cinema/avengers-endgame.jpg',
]

function normalizeCsvHeader(header: string) {
  return header.replace(/^\uFEFF/, '').trim()
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1
      }

      row.push(field)
      field = ''

      if (row.some((value) => value.trim() !== '')) {
        rows.push(row)
      }
      row = []
      continue
    }

    field += char
  }

  row.push(field)
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row)
  }

  return rows
}

function splitMovieTitle(rawTitle: string) {
  const normalized = rawTitle.replace(/\s+/g, ' ').trim()
  if (!normalized) return { title: '', originalTitle: '' }

  const parts = normalized
    .split(' / ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length <= 1) {
    return { title: normalized, originalTitle: '' }
  }

  return {
    title: parts[0],
    originalTitle: parts.slice(1).join(' / '),
  }
}

function parseSubjectId(link: string) {
  const match = link.match(/\/subject\/(\d+)\//)
  return match ? match[1] : ''
}

function toValidRating(input: string) {
  const parsed = Number.parseInt(input, 10)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 1 || parsed > 5) return null
  return parsed
}

function parseTmdbId(input: number | string | undefined) {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    return Math.round(input)
  }

  if (typeof input === 'string') {
    const parsed = Number.parseInt(input, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function toTimestamp(input: string) {
  if (!input) return 0
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function formatDate(input: string, locale: string) {
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function toDateKeyFromString(input: string) {
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizePosterUrl(path: string | undefined | null) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${TMDB_IMAGE_BASE_URL}${path}`
}

function calculateColumns(containerWidth: number, viewportWidth: number) {
  if (viewportWidth < 768) return BASE_COLUMNS
  const minCardWidth =
    viewportWidth >= 1024 ? MIN_CARD_WIDTH_LG : MIN_CARD_WIDTH_MD
  const gap = viewportWidth >= 1024 ? GAP_LG : GAP_MD
  const columns = Math.floor((containerWidth + gap) / (minCardWidth + gap))
  return Math.max(BASE_COLUMNS, columns || BASE_COLUMNS)
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = current
  }

  return shuffled
}

class TmdbRequestError extends Error {
  status: number
  code: string

  constructor(options: { status: number; code: string; message: string }) {
    super(options.message)
    this.name = 'TmdbRequestError'
    this.status = options.status
    this.code = options.code
  }
}

async function fetchTmdbApi<T>(params: Record<string, string>) {
  const search = new URLSearchParams(params)
  const response = await fetch(`/api/tmdb?${search.toString()}`)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `TMDB HTTP ${response.status}`
    const code =
      typeof payload?.code === 'string' ? payload.code : 'TMDB_REQUEST_FAILED'
    throw new TmdbRequestError({
      status: response.status,
      code,
      message,
    })
  }

  return payload as T
}

async function fetchTmdbMovieById(options: {
  movieId: number
  language: string
}) {
  const { movieId, language } = options
  return fetchTmdbApi<TmdbSearchMovie>({
    action: 'movieById',
    movieId: String(movieId),
    language,
  })
}

async function searchTmdbMovie(options: { query: string; language: string }) {
  const { query, language } = options
  const payload = await fetchTmdbApi<{ results?: TmdbSearchMovie[] }>({
    action: 'searchMovie',
    query,
    language,
  })
  const results = Array.isArray(payload.results) ? payload.results : []
  return results[0] ?? null
}

function buildCsvMovies(
  rawCsv: string,
  overrides: Record<string, MovieOverride>
): CsvMovieItem[] {
  const rows = parseCsvRows(rawCsv.replace(/^\uFEFF/, ''))
  if (rows.length === 0) return []

  const headers = rows[0].map(normalizeCsvHeader)
  const titleIndex = headers.indexOf('片名')
  const ratingIndex = headers.indexOf('个人评分')
  const dateIndex = headers.indexOf('打分日期')
  const linkIndex = headers.indexOf('影片链接')

  const safeTitleIndex = titleIndex >= 0 ? titleIndex : 0
  const safeRatingIndex = ratingIndex >= 0 ? ratingIndex : 1
  const safeDateIndex = dateIndex >= 0 ? dateIndex : 2
  const safeLinkIndex = linkIndex >= 0 ? linkIndex : 3

  const movies: CsvMovieItem[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    const rawTitle = (row[safeTitleIndex] ?? '').trim()
    if (!rawTitle) continue
    if (rawTitle.startsWith('删除')) continue

    const rawRating = (row[safeRatingIndex] ?? '').trim()
    const rawDate = (row[safeDateIndex] ?? '').trim()
    const rawLink = (row[safeLinkIndex] ?? '').trim().replace(/,$/, '')

    const subjectId = parseSubjectId(rawLink)
    const override =
      overrides[subjectId] ||
      overrides[rawLink] ||
      overrides[rawTitle] ||
      overrides[`row-${index}`] ||
      {}

    const { title, originalTitle } = splitMovieTitle(rawTitle)
    const rating = toValidRating(rawRating)
    const platform = (override.platform || DEFAULT_PLATFORM).trim()
    const note = (override.note || '').trim()
    const linkedReview = subjectId
      ? getMovieReviewBySubjectId(subjectId)
      : undefined
    const reviewSlug = (override.reviewSlug || linkedReview?.slug || '').trim()
    const reviewBySlug = reviewSlug
      ? getMovieReviewBySlug(reviewSlug)
      : undefined
    const reviewSummary = (
      reviewBySlug?.summary ||
      linkedReview?.summary ||
      ''
    ).trim()
    const rowId = subjectId ? `${subjectId}-${index}` : `row-${index}`

    movies.push({
      id: rowId,
      subjectId,
      title,
      originalTitle,
      link: rawLink,
      watchDate: rawDate,
      rating,
      platform,
      note,
      tmdbId: parseTmdbId(override.tmdbId),
      tmdbQuery: (override.tmdbQuery || '').trim(),
      reviewSlug,
      reviewSummary,
    })
  }

  movies.sort((a, b) => {
    const timeA = toTimestamp(a.watchDate)
    const timeB = toTimestamp(b.watchDate)
    if (timeA === timeB) return a.id.localeCompare(b.id)
    return timeB - timeA
  })

  return movies
}

async function fetchTmdbEnrichment(options: {
  movie: CsvMovieItem
  language: string
}) {
  const { movie, language } = options

  let result: TmdbSearchMovie | null = null

  if (movie.tmdbId) {
    try {
      result = await fetchTmdbMovieById({
        movieId: movie.tmdbId,
        language,
      })
    } catch {
      result = null
    }
  }

  if (!result) {
    const queryCandidates = [movie.tmdbQuery, movie.originalTitle, movie.title]
      .map((query) => query.trim())
      .filter(Boolean)

    const dedupedQueries: string[] = []
    for (const query of queryCandidates) {
      const lowered = query.toLowerCase()
      if (
        !dedupedQueries.some((existing) => existing.toLowerCase() === lowered)
      ) {
        dedupedQueries.push(query)
      }
    }

    for (const query of dedupedQueries) {
      result = await searchTmdbMovie({
        query,
        language,
      })

      if (result) break
    }
  }

  if (!result || !result.id) {
    return null
  }

  return {
    tmdbId: result.id,
    tmdbTitle: result.title?.trim() || '',
    tmdbOriginalTitle: result.original_title?.trim() || '',
    posterUrl: normalizePosterUrl(result.poster_path),
    releaseDate: result.release_date?.trim() || '',
  } satisfies TmdbEnrichedMovie
}

export function Movies() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const viewMode: ViewMode = 'tmdb'
  const cardLayout: CardLayout = 'grid'
  const [onlyWithReviews, setOnlyWithReviews] = useState(false)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [tmdbMap, setTmdbMap] = useState<
    Record<string, TmdbEnrichedMovie | null>
  >({})
  const [, setTmdbStatus] = useState<TmdbStatus>('idle')
  const [, setTmdbErrorMessage] = useState('')
  const [columns, setColumns] = useState(BASE_COLUMNS)
  const [gridNode, setGridNode] = useState<HTMLDivElement | null>(null)
  const [cinemaLetterImages, setCinemaLetterImages] = useState(() =>
    CINEMA_STILL_IMAGES.slice(0, CINEMA_REVEAL_TEXT.length)
  )

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const tmdbLanguage = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'

  const title = t('nav.movies')
  const description = t('movies.description')

  const movieOverrides = movieOverridesRaw as Record<string, MovieOverride>

  const movieItems = useMemo(
    () => buildCsvMovies(movieCsvRaw, movieOverrides),
    [movieOverrides]
  )

  const filteredMovies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return movieItems.filter((movie) => {
      if (onlyWithReviews && !movie.reviewSlug) return false
      if (selectedRating !== null && movie.rating !== selectedRating)
        return false
      if (
        selectedDateKey &&
        toDateKeyFromString(movie.watchDate) !== selectedDateKey
      ) {
        return false
      }

      if (!normalizedKeyword) return true

      const haystack = [
        movie.title,
        movie.originalTitle,
        movie.platform,
        movie.note,
        movie.reviewSummary,
        movie.link,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedKeyword)
    })
  }, [movieItems, keyword, onlyWithReviews, selectedRating, selectedDateKey])

  const itemsPerPage = columns * ROWS_PER_PAGE
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovies.length / itemsPerPage)
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [keyword, onlyWithReviews, selectedRating, selectedDateKey])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageMovies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredMovies.slice(start, start + itemsPerPage)
  }, [filteredMovies, currentPage, itemsPerPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!gridNode) return

    const updateColumns = () => {
      const width = gridNode.getBoundingClientRect().width
      const nextColumns = calculateColumns(width, window.innerWidth)
      setColumns((prev) => (prev === nextColumns ? prev : nextColumns))
    }

    updateColumns()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateColumns)

    if (resizeObserver) {
      resizeObserver.observe(gridNode)
    }

    window.addEventListener('resize', updateColumns)

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', updateColumns)
    }
  }, [gridNode])

  useEffect(() => {
    setCinemaLetterImages(
      shuffleItems(CINEMA_STILL_IMAGES).slice(0, CINEMA_REVEAL_TEXT.length)
    )
  }, [])

  useEffect(() => {
    if (viewMode !== 'tmdb') {
      setTmdbStatus('idle')
      setTmdbErrorMessage('')
      return
    }

    const targets = pageMovies
      .filter((movie) => !(movie.id in tmdbMap))
      .slice(0, 12)

    if (targets.length === 0) {
      setTmdbStatus((prev) => (prev === 'idle' ? 'ready' : prev))
      return
    }

    let cancelled = false
    setTmdbStatus('loading')
    setTmdbErrorMessage('')

    const run = async () => {
      const settled = await Promise.allSettled(
        targets.map(async (movie) => {
          const enriched = await fetchTmdbEnrichment({
            movie,
            language: tmdbLanguage,
          })
          return { movieId: movie.id, enriched }
        })
      )

      if (cancelled) return

      const nextEntries: Record<string, TmdbEnrichedMovie | null> = {}
      let hasSuccess = false
      let firstError: unknown = null

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          hasSuccess = true
          nextEntries[result.value.movieId] = result.value.enriched
        } else if (!firstError) {
          firstError = result.reason
        }
      }

      if (Object.keys(nextEntries).length > 0) {
        setTmdbMap((prev) => ({ ...prev, ...nextEntries }))
      }

      if (hasSuccess) {
        setTmdbStatus('ready')
      } else if (firstError) {
        setTmdbStatus('error')
        if (
          firstError instanceof TmdbRequestError &&
          firstError.code === 'TMDB_MISSING_CONFIG'
        ) {
          setTmdbErrorMessage(t('movies.tmdb.errors.missingConfig'))
        } else if (
          firstError instanceof TmdbRequestError &&
          (firstError.status === 401 || firstError.status === 403)
        ) {
          setTmdbErrorMessage(t('movies.tmdb.errors.authFailed'))
        } else {
          setTmdbErrorMessage(t('movies.tmdb.errors.network'))
        }
      }
    }

    run().catch((error) => {
      if (cancelled) return
      setTmdbStatus('error')
      if (
        error instanceof TmdbRequestError &&
        error.code === 'TMDB_MISSING_CONFIG'
      ) {
        setTmdbErrorMessage(t('movies.tmdb.errors.missingConfig'))
      } else if (
        error instanceof TmdbRequestError &&
        (error.status === 401 || error.status === 403)
      ) {
        setTmdbErrorMessage(t('movies.tmdb.errors.authFailed'))
      } else {
        setTmdbErrorMessage(t('movies.tmdb.errors.network'))
      }
    })

    return () => {
      cancelled = true
    }
  }, [pageMovies, tmdbLanguage, tmdbMap, t, viewMode])

  return (
    <>
      <Seo title={title} description={description} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 xl:max-w-[70vw]">
        <section className="mb-8 pb-8">
          <div className="max-w-3xl">
            <div
              aria-hidden="true"
              className="-mb-6 sm:-mb-8 md:-mb-10 lg:-mb-12"
            >
              <RevealText
                text={CINEMA_REVEAL_TEXT}
                align="left"
                textColor="text-slate-200 dark:text-white/10"
                overlayColor="text-amber-400/70 dark:text-amber-200/40"
                imageStartPosition="40% center"
                imageHoverPosition="52% center"
                fontSize="text-[clamp(4.25rem,17vw,9.5rem)]"
                letterDelay={0.065}
                overlayDelay={0.045}
                overlayDuration={0.45}
                springDuration={720}
                letterImages={cinemaLetterImages}
                className="max-w-[44rem]"
              />
            </div>
            <div className="relative z-10 mb-4 text-[0.72rem] font-medium tracking-[0.28em] text-slate-500 uppercase dark:text-slate-400">
              {locale === 'zh-CN' ? '观影档案' : 'Movie Archive'}
            </div>
            <h1 className="relative z-10 -mt-1 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:-mt-2 sm:text-5xl dark:text-slate-50">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3.8fr)_minmax(280px,1.2fr)] lg:items-start xl:grid-cols-[minmax(0,4fr)_minmax(296px,1.15fr)]">
          <div className="min-w-0">
            <WatchActivityCalendar
              watchDates={movieItems.map((movie) => movie.watchDate)}
              locale={locale}
              selectedDateKey={selectedDateKey}
              onSelectDateKey={setSelectedDateKey}
            />

            <section className="mb-6 pb-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <label className="relative max-w-xl min-w-0 flex-1 border-b border-slate-200/80 pb-2 dark:border-[#2b2f36]">
                  <Search
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder={t('movies.searchPlaceholder')}
                    className="w-full bg-transparent py-2 pr-0 pl-7 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </label>

                <div className="flex flex-col gap-3 lg:items-end">
                  <button
                    type="button"
                    onClick={() => setOnlyWithReviews((prev) => !prev)}
                    className={cn(
                      'inline-flex w-fit items-center gap-2 border-b pb-1 text-sm transition',
                      onlyWithReviews
                        ? 'border-emerald-500 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-[#3a3f48] dark:hover:text-slate-200'
                    )}
                  >
                    <span className="text-[0.72rem] tracking-[0.18em] uppercase">
                      {onlyWithReviews
                        ? t('movies.reviews.onlyWithReviewsOn')
                        : t('movies.reviews.onlyWithReviewsOff')}
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {movieItems.length === 0 ? (
              <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-8 text-center shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-slate-900/70 dark:shadow-none">
                <Clapperboard
                  size={34}
                  className="mx-auto mb-3 text-slate-400 dark:text-slate-500"
                />
                <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t('movies.empty.title')}
                </h2>
                <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {t('movies.empty.description')}
                </p>
              </section>
            ) : filteredMovies.length === 0 ? (
              <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-8 text-center text-sm text-slate-600 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-slate-900/70 dark:text-slate-400 dark:shadow-none">
                {t('movies.noResults')}
              </section>
            ) : (
              <>
                <div
                  ref={setGridNode}
                  className={cn(
                    cardLayout === 'grid' ? 'grid gap-3 lg:gap-4' : 'space-y-4'
                  )}
                  style={
                    cardLayout === 'grid'
                      ? {
                          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        }
                      : undefined
                  }
                >
                  {pageMovies.map((movie) => {
                    const watchedAt = formatDate(movie.watchDate, locale)
                    const tmdb = tmdbMap[movie.id] ?? null
                    const showPoster =
                      viewMode === 'tmdb' && Boolean(tmdb?.posterUrl)
                    const reviewPath = movie.reviewSlug
                      ? `/movies/reviews/${encodeURIComponent(movie.reviewSlug)}`
                      : ''

                    const canOpenReview = Boolean(reviewPath)
                    const hasReview = Boolean(movie.reviewSlug)
                    const cardExcerpt = (
                      movie.reviewSummary ||
                      movie.note ||
                      ''
                    ).trim()
                    const metadata = [
                      `${t('movies.watchDate')}: ${watchedAt || '--'}`,
                    ]

                    return (
                      <button
                        key={movie.id}
                        type="button"
                        disabled={!canOpenReview}
                        onClick={
                          canOpenReview ? () => navigate(reviewPath) : undefined
                        }
                        onKeyDown={
                          canOpenReview
                            ? (event) => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault()
                                  navigate(reviewPath)
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          'group relative flex h-full w-full flex-col overflow-hidden rounded-[1.4rem] border border-slate-200/70 p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:shadow-[0_28px_68px_-40px_rgba(15,23,42,0.4)] dark:border-0 dark:shadow-none',
                          hasReview
                            ? 'bg-white/88 dark:bg-[#17191c]/96'
                            : 'bg-white/78 dark:bg-[#17191c]/92',
                          canOpenReview
                            ? 'cursor-pointer focus:ring-2 focus:ring-emerald-300 focus:outline-none dark:focus:ring-emerald-700'
                            : 'cursor-default',
                          cardLayout === 'grid'
                            ? 'flex h-full w-full flex-col'
                            : ''
                        )}
                      >
                        {viewMode === 'tmdb' ? (
                          <div className="relative mb-4 aspect-[2/3] overflow-hidden rounded-[1.05rem] bg-slate-100 dark:bg-[#1f2328]">
                            {showPoster ? (
                              <img
                                src={tmdb?.posterUrl}
                                alt={movie.title}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.15)_0%,rgba(148,163,184,0.04)_36%,transparent_70%)] text-slate-500 dark:text-slate-400">
                                <Clapperboard size={20} />
                                <span className="px-2 text-center text-xs">
                                  {t('movies.tmdb.noPoster')}
                                </span>
                              </div>
                            )}

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                            {hasReview ? (
                              <div className="absolute top-3 left-3 text-[0.62rem] font-medium tracking-[0.22em] text-white/92 uppercase">
                                {t('movies.reviews.hasReviewBadge')}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="line-clamp-2 text-[1.05rem] leading-snug font-semibold text-slate-900 dark:text-slate-100">
                                {movie.title}
                              </h2>
                              {movie.originalTitle ? (
                                <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                                  {movie.originalTitle}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-end">
                              {movie.link ? (
                                <a
                                  href={movie.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={t('movies.actions.openDouban')}
                                  title={t('movies.actions.openDouban')}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/88 text-slate-600 shadow-none transition hover:text-emerald-600 hover:shadow-sm dark:bg-[#17191c] dark:text-slate-300 dark:hover:text-emerald-300"
                                >
                                  <RiDoubanLine size={16} />
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <div className="mb-3 flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, index) => {
                              const active =
                                movie.rating !== null && index < movie.rating
                              return (
                                <Star
                                  key={index}
                                  size={14}
                                  className={cn(
                                    active
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300 dark:text-[#3a3f48]'
                                  )}
                                />
                              )
                            })}
                            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                              {movie.rating
                                ? t('movies.rating.value', {
                                    rating: movie.rating,
                                  })
                                : t('movies.rating.unrated')}
                            </span>
                          </div>

                          <div className="mt-auto space-y-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                              {metadata.map((item) => (
                                <span key={item}>{item}</span>
                              ))}
                            </div>

                            {cardExcerpt ? (
                              <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {cardExcerpt}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <MovieStatsPanel
              watchCount={movieItems.length}
              ratings={movieItems.map((movie) => movie.rating)}
              doubanProfileUrl={DOUBAN_PROFILE_URL}
              tmdbProfileUrl={TMDB_PROFILE_URL}
              selectedRating={selectedRating}
              onSelectRating={setSelectedRating}
            />
            <MovieGuestbook locale={locale} />
          </aside>
        </div>
      </div>
    </>
  )
}
