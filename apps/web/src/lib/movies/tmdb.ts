import {
  TMDB_BACKDROP_IMAGE_BASE_URL,
  TMDB_IMAGE_BASE_URL,
} from './movieConstants'
import type {
  CsvMovieItem,
  TmdbEnrichedMovie,
  TmdbSearchMovie,
} from './movieTypes'

export class TmdbRequestError extends Error {
  status: number
  code: string

  constructor(options: { status: number; code: string; message: string }) {
    super(options.message)
    this.name = 'TmdbRequestError'
    this.status = options.status
    this.code = options.code
  }
}

function normalizeImageUrl(path: string | undefined | null, baseUrl: string) {
  if (!path) return ''
  return /^https?:\/\//i.test(path) ? path : `${baseUrl}${path}`
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

async function fetchMovieById(movieId: number, language: string) {
  return fetchTmdbApi<TmdbSearchMovie>({
    action: 'movieById',
    movieId: String(movieId),
    language,
  })
}

async function searchMovie(query: string, language: string) {
  const payload = await fetchTmdbApi<{ results?: TmdbSearchMovie[] }>({
    action: 'searchMovie',
    query,
    language,
  })
  return Array.isArray(payload.results) ? (payload.results[0] ?? null) : null
}

function uniqueQueries(movie: CsvMovieItem) {
  const queries = [movie.tmdbQuery, movie.originalTitle, movie.title]
    .map((query) => query.trim())
    .filter(Boolean)
  return queries.filter(
    (query, index) =>
      queries.findIndex(
        (candidate) => candidate.toLowerCase() === query.toLowerCase()
      ) === index
  )
}

export async function fetchTmdbEnrichment(options: {
  movie: CsvMovieItem
  language: string
}): Promise<TmdbEnrichedMovie | null> {
  const { movie, language } = options
  let result: TmdbSearchMovie | null = null

  if (movie.tmdbId) {
    try {
      result = await fetchMovieById(movie.tmdbId, language)
    } catch {
      result = null
    }
  }

  if (!result) {
    for (const query of uniqueQueries(movie)) {
      result = await searchMovie(query, language)
      if (result) break
    }
  }

  if (!result?.id) return null

  return {
    tmdbId: result.id,
    tmdbTitle: result.title?.trim() || '',
    tmdbOriginalTitle: result.original_title?.trim() || '',
    posterUrl: normalizeImageUrl(result.poster_path, TMDB_IMAGE_BASE_URL),
    backdropUrl: normalizeImageUrl(
      result.backdrop_path,
      TMDB_BACKDROP_IMAGE_BASE_URL
    ),
    releaseDate: result.release_date?.trim() || '',
  }
}
