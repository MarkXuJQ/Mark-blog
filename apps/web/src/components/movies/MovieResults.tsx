import { Clapperboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/ui/Pagination'
import type { CsvMovieItem, TmdbEnrichedMovie } from '@/lib/movies/movieTypes'
import { MovieShelf } from './MovieShelf'

interface MovieResultsProps {
  movieCount: number
  filteredCount: number
  pageMovies: CsvMovieItem[]
  tmdbMap: Record<string, TmdbEnrichedMovie | null>
  locale: string
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  listRef: React.MutableRefObject<HTMLDivElement | null>
}

export function MovieResults({
  movieCount,
  filteredCount,
  pageMovies,
  tmdbMap,
  locale,
  currentPage,
  totalPages,
  onPageChange,
  listRef,
}: MovieResultsProps) {
  if (movieCount === 0) {
    return <MovieEmptyState />
  }

  if (filteredCount === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-8 text-center text-sm text-slate-600 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-slate-900/70 dark:text-slate-400 dark:shadow-none">
        <MovieNoResultsState />
      </section>
    )
  }

  return (
    <>
      <MovieShelf movies={pageMovies} tmdbMap={tmdbMap} locale={locale} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        contentRef={listRef}
      />
    </>
  )
}

function MovieEmptyState() {
  const { t } = useTranslation()

  return (
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
  )
}

function MovieNoResultsState() {
  const { t } = useTranslation()
  return <>{t('movies.noResults')}</>
}
