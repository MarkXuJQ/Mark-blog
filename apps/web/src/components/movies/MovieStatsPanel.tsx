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
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/72 p-5 shadow-[0_24px_56px_-36px_rgba(15,23,42,0.35)] backdrop-blur dark:border-[#2b2f36] dark:bg-[#17191c]/92 dark:shadow-[0_28px_56px_-34px_rgba(0,0,0,0.5)]">
      <div className="space-y-6">
        <div className="border-b border-slate-200/80 pb-5 dark:border-[#2b2f36]">
          <div className="text-[0.68rem] font-medium tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
            {t('movies.stats.watchedCount')}
          </div>
          <div className="mt-3 text-5xl leading-none font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50">
            {watchCount}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[0.68rem] font-medium tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
            {t('movies.stats.ratingBreakdown')}
          </div>
          <div className="space-y-3">
            {ratingDistribution.map((item) => (
              <div key={item.rating}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectRating(item.rating)}
                      className="group inline-flex items-center gap-0.5 text-left"
                      aria-pressed={selectedRating === item.rating}
                      aria-label={t('movies.rating.value', {
                        rating: item.rating,
                      })}
                    >
                      {Array.from({ length: item.rating }).map((_, index) => (
                        <Star
                          key={`${item.rating}-${index}`}
                          size={11}
                          className={cn(
                            'transition-transform duration-200 group-hover:scale-[1.12]',
                            selectedRating === item.rating
                              ? 'fill-amber-500 text-amber-500'
                              : 'fill-amber-400 text-amber-400'
                          )}
                          style={{ transitionDelay: `${index * 35}ms` }}
                        />
                      ))}
                    </button>

                    <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200/60 dark:bg-[#23262c]">
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

        {selectedRating !== null ? (
          <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 text-[11px] text-slate-500 dark:border-[#2b2f36] dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('movies.rating.value', { rating: selectedRating })}
            </span>
            <button
              type="button"
              onClick={() => onSelectRating(null)}
              className="border-b border-transparent pb-0.5 font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            >
              {t('movies.stats.clearFilter', '清除筛选')}
            </button>
          </div>
        ) : null}

        <div className="border-t border-slate-200/80 pt-3 dark:border-[#2b2f36]">
          <div className="mb-3 text-[0.68rem] font-medium tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
            {t('movies.profile.label')}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href={doubanProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 border-b border-transparent pb-0.5 text-sm text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            >
              <RiDoubanLine size={14} />
              {t('movies.profile.douban')}
            </a>
            <a
              href={tmdbProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 border-b border-transparent pb-0.5 text-sm text-slate-600 transition hover:border-sky-300 hover:text-sky-600 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
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
