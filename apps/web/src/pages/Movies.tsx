import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { MovieGuestbook } from '@/components/movies/MovieGuestbook'
import { MovieResults } from '@/components/movies/MovieResults'
import { MovieStatsPanel } from '@/components/movies/MovieStatsPanel'
import { MoviesToolbar } from '@/components/movies/MoviesToolbar'
import { WatchActivityCalendar } from '@/components/movies/WatchActivityCalendar'
import { Seo } from '@/app/seo/Seo'
import { RevealText } from '@/components/ui/reveal-text'
import { useMovieCatalog } from '@/hooks/movies/useMovieCatalog'
import { useTmdbEnrichment } from '@/hooks/movies/useTmdbEnrichment'
import {
  CINEMA_BACKGROUND_INTERVAL_MS,
  CINEMA_REVEAL_TEXT,
  CINEMA_STILL_IMAGES,
  DOUBAN_PROFILE_URL,
  TMDB_PROFILE_URL,
} from '@/lib/movies/movieConstants'
import { shuffleItems } from '@/lib/movies/movieUtils'

export function Movies() {
  const { t, i18n } = useTranslation()
  const [cinemaLetterImages, setCinemaLetterImages] = useState(() =>
    CINEMA_STILL_IMAGES.slice(0, CINEMA_REVEAL_TEXT.length)
  )
  const [cinemaBackgroundIndex, setCinemaBackgroundIndex] = useState(0)
  const [activeCinemaLetterIndex, setActiveCinemaLetterIndex] = useState<
    number | null
  >(null)
  const catalog = useMovieCatalog()
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const tmdbMap = useTmdbEnrichment(catalog.pageMovies, locale)
  const title = t('nav.movies')
  const description = t('movies.description')
  const cinemaBackgroundImage =
    cinemaLetterImages[
      activeCinemaLetterIndex ??
        cinemaBackgroundIndex % Math.max(cinemaLetterImages.length, 1)
    ] ?? CINEMA_STILL_IMAGES[0]

  useEffect(() => {
    if (window.__PRERENDER__) return
    setCinemaLetterImages(
      shuffleItems(CINEMA_STILL_IMAGES).slice(0, CINEMA_REVEAL_TEXT.length)
    )
  }, [])

  useEffect(() => {
    if (
      window.__PRERENDER__ ||
      activeCinemaLetterIndex !== null ||
      cinemaLetterImages.length <= 1
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      setCinemaBackgroundIndex(
        (current) => (current + 1) % cinemaLetterImages.length
      )
    }, CINEMA_BACKGROUND_INTERVAL_MS)

    return () => window.clearTimeout(timer)
  }, [
    activeCinemaLetterIndex,
    cinemaBackgroundIndex,
    cinemaLetterImages.length,
  ])

  return (
    <>
      <Seo title={title} description={description} />
      <MoviesHero
        title={title}
        description={description}
        locale={locale}
        backgroundImage={cinemaBackgroundImage}
        letterImages={cinemaLetterImages}
        onActiveLetterChange={(index) => {
          setActiveCinemaLetterIndex(index)
          if (index !== null) setCinemaBackgroundIndex(index)
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-8 xl:max-w-[70vw]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3.8fr)_minmax(280px,1.2fr)] lg:items-start xl:grid-cols-[minmax(0,4fr)_minmax(296px,1.15fr)]">
          <div className="min-w-0">
            <WatchActivityCalendar
              watchDates={catalog.movieItems.map((movie) => movie.watchDate)}
              locale={locale}
              selectedDateKey={catalog.selectedDateKey}
              onSelectDateKey={catalog.setSelectedDateKey}
            />
            <MoviesToolbar
              keyword={catalog.keyword}
              onKeywordChange={catalog.setKeyword}
              movieFilter={catalog.movieFilter}
              onMovieFilterChange={catalog.setMovieFilter}
              cardLayout={catalog.cardLayout}
              onCardLayoutChange={(layout) => {
                catalog.setCardLayout(layout)
                catalog.setCurrentPage(1)
              }}
            />
            <MovieResults
              movieCount={catalog.movieItems.length}
              filteredCount={catalog.filteredMovies.length}
              pageMovies={catalog.pageMovies}
              tmdbMap={tmdbMap}
              cardLayout={catalog.cardLayout}
              columns={catalog.columns}
              locale={locale}
              currentPage={catalog.currentPage}
              totalPages={catalog.totalPages}
              onPageChange={catalog.setCurrentPage}
              setGridNode={catalog.setGridNode}
              listRef={catalog.listRef}
            />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <MovieStatsPanel
              watchCount={catalog.movieItems.length}
              ratings={catalog.movieItems.map((movie) => movie.rating)}
              doubanProfileUrl={DOUBAN_PROFILE_URL}
              tmdbProfileUrl={TMDB_PROFILE_URL}
              selectedRating={catalog.selectedRating}
              onSelectRating={catalog.setSelectedRating}
            />
            <MovieGuestbook locale={locale} />
          </aside>
        </div>
      </div>
    </>
  )
}

function MoviesHero({
  title,
  description,
  locale,
  backgroundImage,
  letterImages,
  onActiveLetterChange,
}: {
  title: string
  description: string
  locale: string
  backgroundImage: string
  letterImages: string[]
  onActiveLetterChange: (index: number | null) => void
}) {
  return (
    <div className="relative isolate w-full pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-0 opacity-42 saturate-[0.82] sm:opacity-46 lg:opacity-50 dark:opacity-36">
          <AnimatePresence initial={false}>
            <motion.img
              key={backgroundImage}
              src={backgroundImage}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.25, ease: 'easeInOut' }}
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </AnimatePresence>
        </div>
        <div className="absolute inset-0 bg-[var(--page-background)] opacity-18 dark:opacity-28" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--page-background)_32%,transparent)_0%,transparent_38%,var(--page-background)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 xl:max-w-[70vw]">
        <section className="pb-12 sm:pb-16">
          <div className="max-w-3xl">
            <div
              aria-hidden="true"
              className="-mb-6 sm:-mb-8 md:-mb-10 lg:-mb-12"
            >
              <RevealText
                text={CINEMA_REVEAL_TEXT}
                align="left"
                textColor="text-slate-200 dark:text-white/10"
                overlayColor="text-amber-400/70 dark:text-amber-200/40"
                imageStartPosition="40% center"
                imageHoverPosition="52% center"
                fontSize="text-[clamp(4.25rem,17vw,9.5rem)]"
                letterDelay={0.065}
                overlayDelay={0.045}
                overlayDuration={0.45}
                springDuration={720}
                letterImages={letterImages}
                className="max-w-[44rem]"
                onActiveLetterChange={onActiveLetterChange}
              />
            </div>
            <div className="relative z-10 mb-4 text-[0.72rem] font-medium tracking-[0.28em] text-slate-500 uppercase dark:text-slate-400">
              {locale === 'zh-CN' ? '观影档案' : 'Movie Archive'}
            </div>
            <h1 className="relative z-10 -mt-1 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:-mt-2 sm:text-5xl dark:text-slate-50">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
