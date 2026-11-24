import { useEffect, useMemo, useRef, useState } from 'react'
import movieCsvRaw from '@content/movies/movie.csv?raw'
import movieOverridesRaw from '@content/movies/movie-overrides.json'
import { buildCsvMovies } from '@/lib/movies/movieCsv'
import { SHELF_ITEMS_PER_PAGE, toDateKey } from '@/lib/movies/movieUtils'
import type { MovieFilter, MovieOverride } from '@/lib/movies/movieTypes'

const movieOverrides = movieOverridesRaw as Record<string, MovieOverride>

export function useMovieCatalog() {
  const [keyword, setKeyword] = useState('')
  const [movieFilter, setMovieFilter] = useState<MovieFilter>('all')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const listRef = useRef<HTMLDivElement | null>(null)

  const movieItems = useMemo(
    () => buildCsvMovies(movieCsvRaw, movieOverrides),
    []
  )
  const filteredMovies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return movieItems.filter((movie) => {
      if (movieFilter === 'reviews' && !movie.reviewSlug) return false
      if (selectedRating !== null && movie.rating !== selectedRating)
        return false
      if (selectedDateKey && toDateKey(movie.watchDate) !== selectedDateKey) {
        return false
      }
      if (!normalizedKeyword) return true

      return [
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
        .includes(normalizedKeyword)
    })
  }, [keyword, movieFilter, movieItems, selectedDateKey, selectedRating])

  const itemsPerPage = SHELF_ITEMS_PER_PAGE
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovies.length / itemsPerPage)
  )
  const pageMovies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredMovies.slice(start, start + itemsPerPage)
  }, [currentPage, filteredMovies, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [keyword, movieFilter, selectedDateKey, selectedRating])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return {
    keyword,
    setKeyword,
    movieFilter,
    setMovieFilter,
    selectedRating,
    setSelectedRating,
    selectedDateKey,
    setSelectedDateKey,
    currentPage,
    setCurrentPage,
    listRef,
    movieItems,
    filteredMovies,
    pageMovies,
    totalPages,
  }
}
