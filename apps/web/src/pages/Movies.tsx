import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clapperboard,
  ExternalLink,
  LayoutGrid,
  List,
  Search,
  Star,
} from 'lucide-react'
import { MovieStatsPanel } from '../components/movies/MovieStatsPanel'
import { Seo } from '../components/seo/Seo'
import { WatchActivityCalendar } from '../components/movies/WatchActivityCalendar'
import { DraggableBackToTop } from '../components/ui/DraggableBackToTop'
import { cn } from '../utils/cn'
import { Pagination } from '../components/ui/Pagination'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
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


const ITEMS_PER_PAGE = 24
const DEFAULT_PLATFORM = 'Douban'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const DOUBAN_PROFILE_URL =
  'https://www.douban.com/people/191287070/?_i=3746089pLWPXRI,3746152pLWPXRI'
const TMDB_PROFILE_URL = 'https://www.themoviedb.org/u/MarkXu269'

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


function normalizePosterUrl(path: string | undefined | null) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${TMDB_IMAGE_BASE_URL}${path}`
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
      typeof payload?.error === 'string' ? payload.error : `TMDB HTTP ${response.status}`
    const code = typeof payload?.code === 'string' ? payload.code : 'TMDB_REQUEST_FAILED'
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

async function searchTmdbMovie(options: {
  query: string
  language: string
}) {
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
      if (!dedupedQueries.some((existing) => existing.toLowerCase() === lowered)) {
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
  const [keyword, setKeyword] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('csv')
  const [cardLayout, setCardLayout] = useState<CardLayout>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [tmdbMap, setTmdbMap] = useState<Record<string, TmdbEnrichedMovie | null>>({})
  const [tmdbStatus, setTmdbStatus] = useState<TmdbStatus>('idle')
  const [tmdbErrorMessage, setTmdbErrorMessage] = useState('')

  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const tmdbLanguage = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'

  const title = t('nav.movies')
  const description =
    locale === 'zh-CN'
      ? '记录我看过的电影，记录来自豆瓣'
      : 'A personal movie log sourced from Douban.'

  const movieOverrides = movieOverridesRaw as Record<string, MovieOverride>

  const movieItems = useMemo(
    () => buildCsvMovies(movieCsvRaw, movieOverrides),
    [movieOverrides]
  )

  const filteredMovies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return movieItems.filter((movie) => {
      if (!normalizedKeyword) return true

      const haystack = [
        movie.title,
        movie.originalTitle,
        movie.platform,
        movie.note,
        movie.link,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedKeyword)
    })
  }, [movieItems, keyword])

  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [keyword, viewMode, cardLayout])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageMovies = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredMovies.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredMovies, currentPage])

  useEffect(() => {
    if (viewMode !== 'tmdb') {
      setTmdbStatus('idle')
      setTmdbErrorMessage('')
      return
    }

    const targets = pageMovies.filter((movie) => !(movie.id in tmdbMap)).slice(0, 12)

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
      if (error instanceof TmdbRequestError && error.code === 'TMDB_MISSING_CONFIG') {
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
  }, [
    pageMovies,
    tmdbLanguage,
    tmdbMap,
    t,
    viewMode,
  ])

  return (
    <>
      <Seo title={title} description={description} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 xl:max-w-[70vw]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3.8fr)_minmax(280px,1.2fr)] lg:items-start xl:grid-cols-[minmax(0,4fr)_minmax(296px,1.15fr)]">
          <div className="min-w-0">
            <section className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
            </section>

            <section className="mb-6 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative min-w-[220px] flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder={t('movies.searchPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                  />
                </label>

                <SegmentedToggle
                  value={viewMode}
                  onValueChange={setViewMode}
                  ariaLabel="Movie data mode"
                  size="sm"
                  items={[
                    {
                      value: 'csv',
                      ariaLabel: t('movies.mode.csv'),
                      content: t('movies.mode.csv'),
                      activeTextClassName: 'text-slate-900 dark:text-slate-100',
                    },
                    {
                      value: 'tmdb',
                      ariaLabel: t('movies.mode.tmdb'),
                      content: t('movies.mode.tmdb'),
                      activeTextClassName: 'text-slate-900 dark:text-slate-100',
                    },
                  ]}
                />

                <SegmentedToggle
                  value={cardLayout}
                  onValueChange={setCardLayout}
                  ariaLabel="Movie card layout"
                  size="sm"
                  buttonClassName="gap-1"
                  items={[
                    {
                      value: 'list',
                      ariaLabel: t('movies.layout.list'),
                      content: (
                        <>
                          <List size={14} />
                          {t('movies.layout.list')}
                        </>
                      ),
                      activeTextClassName: 'text-slate-900 dark:text-slate-100',
                    },
                    {
                      value: 'grid',
                      ariaLabel: t('movies.layout.grid'),
                      content: (
                        <>
                          <LayoutGrid size={14} />
                          {t('movies.layout.grid')}
                        </>
                      ),
                      activeTextClassName: 'text-slate-900 dark:text-slate-100',
                    },
                  ]}
                />
              </div>

              {viewMode === 'tmdb' ? (
                <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50/70 px-3 py-2 text-xs text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/25 dark:text-sky-200">
                  {t('movies.tmdb.notice')}
                  {tmdbStatus === 'loading' ? (
                    <span className="ml-2">{t('movies.tmdb.loading')}</span>
                  ) : null}
                  {tmdbStatus === 'error' && tmdbErrorMessage ? (
                    <span className="ml-2 text-rose-600 dark:text-rose-300">
                      {tmdbErrorMessage}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </section>

            <WatchActivityCalendar
              watchDates={movieItems.map((movie) => movie.watchDate)}
              locale={locale}
            />

            {movieItems.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-700 dark:bg-slate-900/70">
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
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                {t('movies.noResults')}
              </section>
            ) : (
              <>
                <div
                  className={cn(
                    cardLayout === 'grid'
                      ? 'grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(210px,1fr))] lg:gap-4'
                      : 'space-y-4'
                  )}
                >
                  {pageMovies.map((movie) => {
                    const watchedAt = formatDate(movie.watchDate, locale)
                    const tmdb = tmdbMap[movie.id] ?? null
                    const showPoster = viewMode === 'tmdb' && Boolean(tmdb?.posterUrl)
                    const tmdbLink = tmdb?.tmdbId
                      ? `https://www.themoviedb.org/movie/${tmdb.tmdbId}`
                      : ''

                    return (
                      <article
                        key={movie.id}
                        className={cn(
                          'group rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80',
                          cardLayout === 'grid'
                            ? 'flex h-full flex-col'
                            : viewMode === 'tmdb'
                              ? 'grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)]'
                              : 'block'
                        )}
                      >
                        {viewMode === 'tmdb' ? (
                          <div
                            className={cn(
                              'aspect-[2/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800',
                              cardLayout === 'grid' ? 'mb-3' : ''
                            )}
                          >
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
                              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                                <Clapperboard size={20} />
                                <span className="px-2 text-center text-xs">
                                  {t('movies.tmdb.noPoster')}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            'flex min-w-0 flex-col',
                            cardLayout === 'grid' ? 'flex-1' : ''
                          )}
                        >
                          <div
                            className={cn(
                              'mb-2 flex items-start justify-between gap-3',
                              cardLayout === 'grid' ? 'mb-3 block space-y-2' : ''
                            )}
                          >
                            <div className="min-w-0">
                              <h2
                                className={cn(
                                  'text-lg font-semibold text-slate-900 dark:text-slate-100',
                                  cardLayout === 'grid'
                                    ? 'line-clamp-2 leading-snug'
                                    : 'truncate'
                                )}
                              >
                                {movie.title}
                              </h2>
                              {movie.originalTitle && cardLayout !== 'grid' ? (
                                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                                  {movie.originalTitle}
                                </p>
                              ) : null}
                              {viewMode === 'tmdb' && tmdb?.tmdbTitle && cardLayout !== 'grid' ? (
                                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                                  TMDB: {tmdb.tmdbTitle}
                                  {tmdb.tmdbOriginalTitle &&
                                  tmdb.tmdbOriginalTitle !== tmdb.tmdbTitle
                                    ? ` / ${tmdb.tmdbOriginalTitle}`
                                    : ''}
                                </p>
                              ) : null}
                            </div>

                            <div
                              className={cn(
                                'flex items-center gap-2',
                                cardLayout === 'grid' ? 'flex-wrap' : ''
                              )}
                            >
                              {tmdbLink ? (
                                <a
                                  href={tmdbLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/75 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-300',
                                    cardLayout === 'grid' ? 'px-2 py-1' : ''
                                  )}
                                >
                                  <ExternalLink size={13} />
                                  TMDB
                                </a>
                              ) : null}
                              {movie.link ? (
                                <a
                                  href={movie.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/75 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-300',
                                    cardLayout === 'grid' ? 'px-2 py-1' : ''
                                  )}
                                >
                                  <ExternalLink size={13} />
                                  {t('movies.actions.openDouban')}
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {viewMode === 'tmdb' && tmdb?.releaseDate ? (
                              <span className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 text-xs font-medium text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/25 dark:text-sky-300">
                                {t('movies.tmdb.releaseDate')}: {formatDate(tmdb.releaseDate, locale)}
                              </span>
                            ) : null}
                          </div>

                          <div className="mb-2 flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, index) => {
                              const active = movie.rating !== null && index < movie.rating
                              return (
                                <Star
                                  key={index}
                                  size={14}
                                  className={cn(
                                    active
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300 dark:text-slate-700'
                                  )}
                                />
                              )
                            })}
                            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                              {movie.rating
                                ? t('movies.rating.value', { rating: movie.rating })
                                : t('movies.rating.unrated')}
                            </span>
                          </div>

                          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              {t('movies.watchDate')}: {watchedAt || '--'}
                            </span>
                          </div>

                          {movie.note && cardLayout !== 'grid' ? (
                            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {movie.note}
                            </p>
                          ) : null}
                        </div>
                      </article>
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
            />
          </aside>
        </div>
      </div>

      <DraggableBackToTop />
    </>
  )
}
