import { Search } from 'lucide-react'
import { LuList } from 'react-icons/lu'
import { RiGalleryView2 } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { SegmentedToggle } from '@/components/ui/SegmentedToggle'
import type { CardLayout, MovieFilter } from '@/lib/movies/movieTypes'

interface MoviesToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  movieFilter: MovieFilter
  onMovieFilterChange: (value: MovieFilter) => void
  cardLayout: CardLayout
  onCardLayoutChange: (value: CardLayout) => void
}

export function MoviesToolbar({
  keyword,
  onKeywordChange,
  movieFilter,
  onMovieFilterChange,
  cardLayout,
  onCardLayoutChange,
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
          </div>
        </div>
      </div>
    </section>
  )
}
