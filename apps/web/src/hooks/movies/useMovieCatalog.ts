import { useEffect, useMemo, useRef, useState } from 'react'
import movieCsvRaw from '@content/movies/movie.csv?raw'
import movieOverridesRaw from '@content/movies/movie-overrides.json'
import { buildCsvMovies } from '@/lib/movies/movieCsv'
import {
  BASE_COLUMNS,
  calculateMovieColumns,
  LIST_ITEMS_PER_PAGE,
  ROWS_PER_PAGE,
  toDateKey,
} from '@/lib/movies/movieUtils'
import type {
  CardLayout,
  MovieFilter,
  MovieOverride,
} from '@/lib/movies/movieTypes'

const movieOverrides = movieOverridesRaw as Record<string, MovieOverride>

export function useMovieCatalog() {
  const [keyword, setKeyword] = useState('')
  const [cardLayout, setCardLayout] = useState<CardLayout>('grid')
  const [movieFilter, setMovieFilter] = useState<MovieFilter>('all')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [columns, setColumns] = useState(BASE_COLUMNS)
  const [gridNode, setGridNode] = useState<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const previousListStateRef = useRef<{
    cardLayout: CardLayout
    currentPage: number
  } | null>(null)

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

  const itemsPerPage =
    cardLayout === 'list' ? LIST_ITEMS_PER_PAGE : columns * ROWS_PER_PAGE
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

  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRERENDER__) return
    const previousState = previousListStateRef.current
    previousListStateRef.current = { cardLayout, currentPage }
    if (
      cardLayout !== 'list' ||
      !previousState ||
      (previousState.cardLayout === cardLayout &&
        previousState.currentPage === currentPage)
    ) {
      return
    }
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [cardLayout, currentPage])

  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRERENDER__ || !gridNode) {
      return
    }

    const updateColumns = () => {
      const width = gridNode.getBoundingClientRect().width
      const nextColumns = calculateMovieColumns(width, window.innerWidth)
      setColumns((current) => (current === nextColumns ? current : nextColumns))
    }

    updateColumns()
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateColumns)
    resizeObserver?.observe(gridNode)
    window.addEventListener('resize', updateColumns)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateColumns)
    }
  }, [gridNode])

  return {
    keyword,
    setKeyword,
    cardLayout,
    setCardLayout,
    movieFilter,
    setMovieFilter,
    selectedRating,
    setSelectedRating,
    selectedDateKey,
    setSelectedDateKey,
    currentPage,
    setCurrentPage,
    columns,
    setGridNode,
    listRef,
    movieItems,
    filteredMovies,
    pageMovies,
    totalPages,
  }
}
