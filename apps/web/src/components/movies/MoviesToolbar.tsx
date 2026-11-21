import { Search } from 'lucide-react'
import { LuBookOpen, LuList } from 'react-icons/lu'
import { RiGalleryView2 } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import { cn } from '@/lib/classNames'
import type { CardLayout, MovieFilter } from '@/lib/movies/movieTypes'

interface MoviesToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  movieFilter: MovieFilter
  onMovieFilterChange: (value: MovieFilter) => void
  cardLayout: CardLayout
  onCardLayoutChange: (value: CardLayout) => void
  betaEnabled: boolean
  onBetaEnabledChange: (value: boolean) => void
}

export function MoviesToolbar({
  keyword,
  onKeywordChange,
  movieFilter,
  onMovieFilterChange,
  cardLayout,
  onCardLayoutChange,
  betaEnabled,
  onBetaEnabledChange,
}: MoviesToolbarProps) {
  const { t } = useTranslation()

  return (
    <section className="mb-6 pb-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label className="relative max-w-xl min-w-0 flex-1 border-b border-slate-200/80 pb-2 dark:border-[#2b2f36]">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder={t('movies.searchPlaceholder')}
              className="w-full bg-transparent py-2 pr-0 pl-7 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={betaEnabled}
              aria-label={t('movies.beta.label')}
              title={t('movies.beta.description')}
              onClick={() => onBetaEnabledChange(!betaEnabled)}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[1.1rem] border px-2.5 text-sm transition sm:h-11 sm:px-3.5',
                betaEnabled
                  ? 'border-[var(--brand-400)] bg-[var(--brand-500)]/10 text-[var(--brand-600)] dark:text-[var(--brand-400)]'
                  : 'border-slate-200/80 text-slate-500 hover:text-slate-800 dark:border-[#2b2f36] dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <LuBookOpen className="h-4 w-4" aria-hidden="true" />
              <span>{t('movies.beta.label')}</span>
              <span
                className={cn(
                  'ml-0.5 h-1.5 w-1.5 rounded-full',
                  betaEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                )}
                aria-hidden="true"
              />
            </button>
            <SelectMenu
              value={movieFilter}
              options={[
                {
                  value: 'all',
                  label: t('movies.filters.allMovies'),
                },
                {
                  value: 'reviews',
                  label: t('movies.filters.withReviews'),
                },
              ]}
              onValueChange={onMovieFilterChange}
              label={t('movies.filters.label')}
              ariaLabel={t('movies.filters.label')}
              className="shrink-0"
              containerClassName="h-10 gap-1 rounded-[1.1rem] px-2.5 pr-2 sm:h-11 sm:gap-2 sm:px-3.5 sm:pr-3"
              labelClassName="hidden sm:inline"
              buttonClassName="max-w-[5.25rem] gap-1 text-sm sm:max-w-[6.8rem]"
              menuClassName="w-52 max-w-[calc(100vw-2rem)]"
            />
            {!betaEnabled ? (
              <SegmentedToggle
                value={cardLayout}
                onValueChange={onCardLayoutChange}
                ariaLabel={t('movies.layout.label')}
                size="sm"
                className="shrink-0"
                buttonClassName="h-8 w-8 px-0"
                items={[
                  {
                    value: 'grid',
                    ariaLabel: t('movies.layout.grid'),
                    tooltip: t('movies.layout.grid'),
                    content: (
                      <RiGalleryView2 className="h-4 w-4" aria-hidden="true" />
                    ),
                  },
                  {
                    value: 'list',
                    ariaLabel: t('movies.layout.list'),
                    tooltip: t('movies.layout.list'),
                    content: <LuList className="h-4 w-4" aria-hidden="true" />,
                  },
                ]}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
