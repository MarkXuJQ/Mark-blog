import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clapperboard, Star } from 'lucide-react'
import { RiDoubanLine } from 'react-icons/ri'
import { cn } from '@/lib/classNames'
import { formatMovieDate } from '@/lib/movies/movieUtils'
import type {
  CardLayout,
  CsvMovieItem,
  TmdbEnrichedMovie,
} from '@/lib/movies/movieTypes'

interface MovieCardProps {
  movie: CsvMovieItem
  tmdb: TmdbEnrichedMovie | null
  cardLayout: CardLayout
  locale: string
}

export function MovieCard({ movie, tmdb, cardLayout, locale }: MovieCardProps) {
  const { t } = useTranslation()
  const imageUrl = cardLayout === 'list' ? tmdb?.backdropUrl : tmdb?.posterUrl
  const reviewPath = movie.reviewSlug
    ? `/movies/reviews/${encodeURIComponent(movie.reviewSlug)}`
    : ''
  const contentClassName = cn(
    'relative flex h-full w-full overflow-hidden rounded-[1.4rem] border border-slate-200/70 p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur transition-[transform,box-shadow,background-color] duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_68px_-40px_rgba(15,23,42,0.4)] dark:border-0 dark:shadow-none',
    movie.reviewSlug
      ? 'bg-white/88 dark:bg-[#17191c]/96'
      : 'bg-white/78 dark:bg-[#17191c]/92',
    cardLayout === 'grid' ? 'flex-col' : 'flex-row gap-3'
  )

  const content = (
    <>
      <MovieCardMedia
        movie={movie}
        imageUrl={imageUrl}
        cardLayout={cardLayout}
      />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          cardLayout === 'list' && 'pt-0.5'
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-left text-[1.05rem] leading-snug font-semibold text-slate-900 dark:text-slate-100">
              {movie.title}
            </h2>
            {movie.originalTitle ? (
              <p className="mt-1 line-clamp-1 text-left text-sm text-slate-500 dark:text-slate-400">
                {movie.originalTitle}
              </p>
            ) : null}
          </div>
          {movie.link ? (
            <a
              href={movie.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('movies.actions.openDouban')}
              title={t('movies.actions.openDouban')}
              className="pointer-events-auto relative z-20 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/88 text-slate-600 shadow-none transition hover:text-emerald-600 hover:shadow-sm dark:bg-[#17191c] dark:text-slate-300 dark:hover:text-emerald-300"
            >
              <RiDoubanLine size={16} />
            </a>
          ) : null}
        </div>

        <div className="mb-3 flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={14}
              className={cn(
                movie.rating !== null && index < movie.rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 dark:text-[#3a3f48]'
              )}
            />
          ))}
        </div>

        <div className="mt-auto space-y-3">
          {(movie.reviewSummary || movie.note).trim() ? (
            <p
              className={cn(
                'text-sm leading-6 text-slate-600 dark:text-slate-300',
                movie.reviewSlug
                  ? 'line-clamp-1'
                  : cardLayout === 'list'
                    ? 'line-clamp-3'
                    : 'line-clamp-2'
              )}
            >
              {(movie.reviewSummary || movie.note).trim()}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            <span>
              {t('movies.watchDate')}:{' '}
              {formatMovieDate(movie.watchDate, locale) || '--'}
            </span>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <article className="group relative h-full">
      {reviewPath ? (
        <>
          <Link
            to={reviewPath}
            aria-label={movie.title}
            className="absolute inset-0 z-0 rounded-[1.4rem] focus:ring-2 focus:ring-emerald-300 focus:outline-none dark:focus:ring-emerald-700"
          />
          <div className={cn(contentClassName, 'pointer-events-none z-10')}>
            {content}
          </div>
        </>
      ) : (
        <div className={contentClassName}>{content}</div>
      )}
    </article>
  )
}

function MovieCardMedia({
  movie,
  imageUrl,
  cardLayout,
}: {
  movie: CsvMovieItem
  imageUrl?: string
  cardLayout: CardLayout
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-slate-100 dark:bg-[#1f2328]',
        cardLayout === 'grid'
          ? 'mb-4 aspect-[2/3] w-full rounded-[1.05rem]'
          : 'min-h-[5.5rem] w-[38%] max-w-[10rem] self-stretch rounded-[0.9rem] sm:w-[30%] sm:max-w-[12rem]'
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
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
      {movie.reviewSlug ? (
        <div className="absolute top-3 left-3 text-[0.62rem] font-medium tracking-[0.22em] text-white/92 uppercase">
          {t('movies.reviews.hasReviewBadge')}
        </div>
      ) : null}
    </div>
  )
}
