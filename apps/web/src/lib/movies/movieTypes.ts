export type CardLayout = 'list' | 'grid'
export type MovieFilter = 'all' | 'reviews'

export interface MovieOverride {
  platform?: string
  note?: string
  tmdbId?: number | string
  tmdbQuery?: string
  reviewSlug?: string
}

export interface CsvMovieItem {
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

export interface TmdbSearchMovie {
  id: number
  title?: string
  original_title?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
}

export interface TmdbEnrichedMovie {
  tmdbId: number
  tmdbTitle: string
  tmdbOriginalTitle: string
  posterUrl: string
  backdropUrl: string
  releaseDate: string
}
