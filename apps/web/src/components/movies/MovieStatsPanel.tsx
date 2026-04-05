import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { RiDoubanLine, RiMovie2Line } from 'react-icons/ri'
import { cn } from '../../utils/cn'

interface MovieStatsPanelProps {
  watchCount: number
  ratings: Array<number | null>
  doubanProfileUrl: string
  tmdbProfileUrl: string
  selectedRating: number | null
  onSelectRating: (rating: number | null) => void
}

export function MovieStatsPanel({
  watchCount,
  ratings,
  doubanProfileUrl,
  tmdbProfileUrl,
  selectedRating,
  onSelectRating,
}: MovieStatsPanelProps) {
  const { t } = useTranslation()

  const ratedValues = useMemo(
    () => ratings.filter((rating): rating is number => rating !== null),
    [ratings]
  )

  const overallScore = useMemo(() => {
    if (ratedValues.length === 0) return null

    const averageStars =
      ratedValues.reduce((sum, rating) => sum + rating, 0) / ratedValues.length

    return Math.round((averageStars / 5) * 100)
  }, [ratedValues])

  const scoreProgress = overallScore ?? 0
  const circleRadius = 42
  const circleCircumference = 2 * Math.PI * circleRadius
  const circleOffset =
    circleCircumference - (scoreProgress / 100) * circleCircumference

  const ratingDistribution = useMemo(() => {
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: ratedValues.filter((value) => value === rating).length,
    }))
    const maxCount = Math.max(...distribution.map((item) => item.count), 1)

    return distribution.map((item) => ({
      ...item,
      width: `${(item.count / maxCount) * 100}%`,
    }))
  }, [ratedValues])

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50/90 to-white/70 p-3.5 dark:border-slate-700/80 dark:from-slate-800/70 dark:to-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('movies.stats.watchedCount')}
              </div>
              <div className="mt-1 text-3xl font-semibold leading-none text-slate-900 dark:text-slate-100">
                {watchCount}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {t('movies.stats.totalLabel', 'All time')}
              </div>
            </div>

            <div className="flex items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 p-2.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60">
              <div className="relative h-[86px] w-[86px]">
                <svg
                  viewBox="0 0 100 100"
                  className="-rotate-90 h-full w-full"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    className="fill-none stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    className="fill-none stroke-[url(#movie-score-gradient)]"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={circleOffset}
                  />
                  <defs>
                    <linearGradient id="movie-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {overallScore === null ? '--' : overallScore}
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400">
                    / 100
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-amber-50/80 via-slate-50/80 to-white/70 p-3.5 dark:border-slate-700/80 dark:from-slate-800/80 dark:via-slate-900/70 dark:to-slate-900/70">
          <div className="space-y-2.5">
            {ratingDistribution.map((item) => (
              <div key={item.rating}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectRating(item.rating)}
                      className="group inline-flex items-center gap-0.5 text-left"
                      aria-pressed={selectedRating === item.rating}
                      title="点击筛选该星级"
                    >
                      {Array.from({ length: item.rating }).map((_, index) => (
                        <Star
                          key={`${item.rating}-${index}`}
                          size={11}
                          className={cn(
                            'transition-transform duration-200 group-hover:scale-[1.18]',
                            selectedRating === item.rating
                              ? 'fill-amber-500 text-amber-500'
                              : 'fill-amber-400 text-amber-400'
                          )}
                          style={{ transitionDelay: `${index * 35}ms` }}
                        />
                      ))}
                      <span className="ml-1 text-[10px] font-medium text-slate-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:text-slate-400">
                        点击筛选
                      </span>
                    </button>

                    <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/60">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300/80 via-orange-400/80 to-rose-400/80"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>

                  <div className="min-w-7 text-right text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {item.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white/80 to-slate-50/80 px-3.5 py-2.5 text-[11px] text-slate-500 shadow-sm dark:border-slate-700/80 dark:from-slate-900/60 dark:to-slate-900/70 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {selectedRating ? `${selectedRating}★` : '全部'}
          </span>
          {selectedRating !== null ? (
            <button
              type="button"
              onClick={() => onSelectRating(null)}
              className="rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            >
              {t('movies.stats.clearFilter', '清除筛选')}
            </button>
          ) : null}
        </div>

        <div className="border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          <div className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
            {t('movies.profile.label')}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={doubanProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            >
              <RiDoubanLine size={14} />
              {t('movies.profile.douban')}
            </a>
            <a
              href={tmdbProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              <RiMovie2Line size={14} />
              {t('movies.profile.tmdb')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
