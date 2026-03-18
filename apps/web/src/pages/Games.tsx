import {
  Clock3,
  ExternalLink,
  Gamepad2,
  Search,
  TimerReset,
  Trophy,
} from 'lucide-react'
import {
  startTransition,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Pagination } from '../components/ui/Pagination'
import { SelectMenu } from '../components/ui/SelectMenu'
import { Seo } from '../components/seo/Seo'
import { cn } from '../utils/cn'

type LoadStatus = 'loading' | 'ready' | 'error'
type GameSort = 'playtime' | 'recent' | 'alphabetical' | 'leastPlayed'

interface SteamProfile {
  steamId: string
  personaName: string
  avatarUrl: string
  profileUrl: string
  reviewsUrl: string
}

interface SteamSummary {
  gameCount: number
  playedCount: number
  unplayedCount: number
  totalMinutes: number
  totalRecentMinutes: number
  totalUnlockedAchievements: number
  totalAvailableAchievements: number
  featuredAppId: number | null
}

interface SteamReviewSummary {
  totalPositive: number
  totalNegative: number
  totalReviews: number
  positivePercent: number
}

interface SteamAchievementStats {
  unlockedCount: number
  totalCount: number
}

interface SteamGame {
  appid: number
  name: string
  playtimeMinutes: number
  recentPlaytimeMinutes: number
  iconUrl: string
  logoUrl: string
  storeUrl: string
  communityUrl: string
  achievementStats: SteamAchievementStats | null
}

interface SteamFeaturedGame extends SteamGame {
  reviewSummary: SteamReviewSummary | null
  headerImage: string
  shortDescription: string
  releaseDate: string
  developers: string[]
  genres: string[]
}

interface SteamDashboard {
  generatedAt: string
  profile: SteamProfile
  summary: SteamSummary
  featured: SteamFeaturedGame[]
  games: SteamGame[]
  snapshotGeneratedAt?: string
  liveGeneratedAt?: string
}

class SteamDashboardError extends Error {
  status: number
  code: string

  constructor(options: { status: number; code: string; message: string }) {
    super(options.message)
    this.name = 'SteamDashboardError'
    this.status = options.status
    this.code = options.code
  }
}

const ITEMS_PER_PAGE = 18

async function fetchSteamDashboard() {
  const response = await fetch('/api/steam')
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new SteamDashboardError({
      status: response.status,
      code:
        typeof payload?.code === 'string' ? payload.code : 'STEAM_REQUEST_FAILED',
      message:
        typeof payload?.error === 'string'
          ? payload.error
          : `Steam HTTP ${response.status}`,
    })
  }

  return payload as SteamDashboard
}

function formatHours(minutes: number, locale: string) {
  const hours = minutes / 60
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: hours > 0 && hours < 10 ? 1 : 0,
    maximumFractionDigits: hours >= 100 ? 0 : 1,
  })
  return formatter.format(hours)
}

function formatInteger(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value)
}

function formatAchievementValue(
  stats: SteamAchievementStats | null,
  locale: string
) {
  if (!stats) return '0'

  const unlocked = formatInteger(stats.unlockedCount, locale)
  if (stats.totalCount > 0) {
    return `${unlocked} / ${formatInteger(stats.totalCount, locale)}`
  }

  return unlocked
}

function formatDateTime(input: string, locale: string) {
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function buildInitials(name: string) {
  const chars = Array.from(name.trim())
  if (chars.length === 0) return 'GM'
  return chars
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getAchievementProgress(game: SteamGame) {
  const unlockedCount = Math.max(
    0,
    Number(game.achievementStats?.unlockedCount) || 0
  )
  const totalCount = Math.max(0, Number(game.achievementStats?.totalCount) || 0)
  const ratio = totalCount > 0 ? unlockedCount / totalCount : 0
  const widthPercent =
    totalCount > 0 && unlockedCount > 0
      ? Math.max(6, Math.min(100, Math.round(ratio * 100)))
      : 0

  if (totalCount <= 0) {
    return {
      unlockedCount,
      totalCount,
      ratio,
      widthPercent,
      fillClassName: '',
    }
  }

  if (ratio < 0.25) {
    return {
      unlockedCount,
      totalCount,
      ratio,
      widthPercent,
      fillClassName: 'bg-gradient-to-r from-emerald-300 to-green-400',
    }
  }

  if (ratio < 0.6) {
    return {
      unlockedCount,
      totalCount,
      ratio,
      widthPercent,
      fillClassName: 'bg-gradient-to-r from-emerald-500 to-green-600',
    }
  }

  if (ratio < 1) {
    return {
      unlockedCount,
      totalCount,
      ratio,
      widthPercent,
      fillClassName: 'bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600',
    }
  }

  return {
    unlockedCount,
    totalCount,
    ratio,
    widthPercent,
    fillClassName:
      'bg-[linear-gradient(90deg,#22c55e_0%,#06b6d4_32%,#3b82f6_64%,#f59e0b_100%)]',
  }
}

function StatTile(props: {
  label: string
  value: string
  hint?: string
  icon: ReactNode
}) {
  const { label, value, hint, icon } = props

  return (
    <div className="rounded-3xl border border-white/50 bg-white/75 p-4 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-950/45">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
        {value}
      </p>

      {hint ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function GameIcon(props: {
  name: string
  iconUrl?: string
  className?: string
  imageClassName?: string
}) {
  const { name, iconUrl = '', className, imageClassName } = props

  if (iconUrl) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-white/60 bg-slate-950/5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/50',
          className
        )}
      >
        <img
          src={iconUrl}
          alt={name}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className={cn('h-full w-full object-cover', imageClassName)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-600 font-semibold text-white shadow-sm',
        className
      )}
      aria-hidden="true"
    >
      <span>{buildInitials(name)}</span>
    </div>
  )
}

function FeaturedGameCard(props: {
  game: SteamFeaturedGame
  locale: string
  reviewLabel: string
  reviewCountLabel: string
  noReviewLabel: string
  lifetimeLabel: string
  achievementLabel: string
  noAchievementsLabel: string
  releaseDateLabel: string
  openStoreLabel: string
}) {
  const {
    game,
    locale,
    reviewLabel,
    reviewCountLabel,
    noReviewLabel,
    lifetimeLabel,
    achievementLabel,
    noAchievementsLabel,
    releaseDateLabel,
    openStoreLabel,
  } = props

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.7)] dark:border-slate-800">
      {game.headerImage ? (
        <img
          src={game.headerImage}
          alt={game.name}
          width={920}
          height={430}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.4),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.84))]" />

      <div className="relative flex h-full min-h-[320px] flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <GameIcon
            name={game.name}
            iconUrl={game.iconUrl}
            className="h-14 w-14 shrink-0 border-white/20 bg-white/10"
          />

          <a
            href={game.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 transition hover:bg-white/20"
            aria-label={openStoreLabel}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/90">
              Steam
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {game.name}
            </h3>
            {game.shortDescription ? (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-200/85">
                {game.shortDescription}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 text-sm text-slate-100/90 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                {lifetimeLabel}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {formatHours(game.playtimeMinutes, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                {achievementLabel}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {game.achievementStats
                  ? formatAchievementValue(game.achievementStats, locale)
                  : noAchievementsLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-100/85">
            {game.reviewSummary ? (
              <>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-400/20 px-3 py-1.5 font-medium text-emerald-100">
                  {reviewLabel.replace(
                    '{{percent}}',
                    formatInteger(game.reviewSummary.positivePercent, locale)
                  )}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-medium">
                  {reviewCountLabel.replace(
                    '{{count}}',
                    formatInteger(game.reviewSummary.totalReviews, locale)
                  )}
                </span>
              </>
            ) : (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-medium">
                {noReviewLabel}
              </span>
            )}

            {game.releaseDate ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-medium">
                {releaseDateLabel.replace('{{date}}', game.releaseDate)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export function Games() {
  const { t, i18n } = useTranslation()
  const title = t('nav.games')
  const description = t('games.description')
  const locale = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [dashboard, setDashboard] = useState<SteamDashboard | null>(null)
  const [errorCode, setErrorCode] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<GameSort>('playtime')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let active = true

    setStatus('loading')
    setErrorCode('')

    fetchSteamDashboard()
      .then((payload) => {
        if (!active) return
        setDashboard(payload)
        setStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        const code =
          error instanceof SteamDashboardError
            ? error.code
            : 'STEAM_REQUEST_FAILED'
        setErrorCode(code)
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [])

  const deferredSearch = useDeferredValue(search)

  const filteredGames = useMemo(() => {
    const allGames = dashboard?.games ?? []
    const normalizedQuery = deferredSearch.trim().toLocaleLowerCase()

    const nextGames = normalizedQuery
      ? allGames.filter((game) =>
          game.name.toLocaleLowerCase().includes(normalizedQuery)
        )
      : [...allGames]

    nextGames.sort((left, right) => {
      if (sort === 'recent') {
        if (right.recentPlaytimeMinutes !== left.recentPlaytimeMinutes) {
          return right.recentPlaytimeMinutes - left.recentPlaytimeMinutes
        }
        if (right.playtimeMinutes !== left.playtimeMinutes) {
          return right.playtimeMinutes - left.playtimeMinutes
        }
        return left.name.localeCompare(right.name, locale)
      }

      if (sort === 'alphabetical') {
        return left.name.localeCompare(right.name, locale)
      }

      if (sort === 'leastPlayed') {
        if (left.playtimeMinutes !== right.playtimeMinutes) {
          return left.playtimeMinutes - right.playtimeMinutes
        }
        return left.name.localeCompare(right.name, locale)
      }

      if (right.playtimeMinutes !== left.playtimeMinutes) {
        return right.playtimeMinutes - left.playtimeMinutes
      }
      if (right.recentPlaytimeMinutes !== left.recentPlaytimeMinutes) {
        return right.recentPlaytimeMinutes - left.recentPlaytimeMinutes
      }
      return left.name.localeCompare(right.name, locale)
    })

    return nextGames
  }, [dashboard?.games, deferredSearch, locale, sort])

  useEffect(() => {
    startTransition(() => {
      setCurrentPage(1)
    })
  }, [deferredSearch, sort])

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / ITEMS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const visibleGames = filteredGames.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const generatedAt = dashboard ? formatDateTime(dashboard.generatedAt, locale) : ''

  const errorMessage = (() => {
    switch (errorCode) {
      case 'STEAM_MISSING_CONFIG':
        return t('games.errors.missingConfig')
      case 'STEAM_AUTH_FAILED':
        return t('games.errors.authFailed')
      case 'STEAM_NETWORK_ERROR':
      case 'STEAM_UPSTREAM_ERROR':
        return t('games.errors.network')
      default:
        return t('games.errors.generic')
    }
  })()

  const sortOptions: Array<{ value: GameSort; label: string }> = [
    { value: 'playtime', label: t('games.sort.playtime') },
    { value: 'recent', label: t('games.sort.recent') },
    { value: 'alphabetical', label: t('games.sort.alphabetical') },
    { value: 'leastPlayed', label: t('games.sort.leastPlayed') },
  ]

  return (
    <>
      <Seo title={title} description={description} />

      <div>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
          <section className="rounded-[32px] border border-slate-200/80 bg-white/75 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/55 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border border-white/70 bg-slate-100 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {dashboard?.profile.avatarUrl ? (
                    <img
                      src={dashboard.profile.avatarUrl}
                      alt={dashboard.profile.personaName}
                      width={96}
                      height={96}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-600 text-2xl font-semibold text-white">
                      M
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
                    {dashboard
                      ? t('games.hero.title', {
                          name: dashboard.profile.personaName,
                        })
                      : title}
                  </h1>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={dashboard?.profile.profileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                        dashboard
                          ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                          : 'pointer-events-none border-slate-200/80 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                      )}
                    >
                      {t('games.profile.openProfile')}
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <a
                      href={dashboard?.profile.reviewsUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                        dashboard
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/80'
                          : 'pointer-events-none border-slate-200/80 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                      )}
                    >
                      {t('games.profile.openReviews')}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  {generatedAt ? (
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                      {t('games.hero.updatedAt', { date: generatedAt })}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <StatTile
                  label={t('games.stats.totalGames')}
                  value={formatInteger(dashboard?.summary.gameCount ?? 0, locale)}
                  icon={<Gamepad2 className="h-5 w-5" />}
                />
                <StatTile
                  label={t('games.stats.totalHours')}
                  value={formatHours(dashboard?.summary.totalMinutes ?? 0, locale)}
                  icon={<Clock3 className="h-5 w-5" />}
                />
                <StatTile
                  label={t('games.stats.recentHours')}
                  value={formatHours(
                    dashboard?.summary.totalRecentMinutes ?? 0,
                    locale
                  )}
                  icon={<TimerReset className="h-5 w-5" />}
                />
                <StatTile
                  label={t('games.stats.totalAchievements')}
                  value={formatInteger(
                    dashboard?.summary.totalUnlockedAchievements ?? 0,
                    locale
                  )}
                  icon={<Trophy className="h-5 w-5" />}
                />
              </div>
            </div>
          </section>

          {status === 'loading' ? (
            <section className="mt-8 rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('games.loading')}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-[28px] bg-slate-100 dark:bg-slate-900"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {status === 'error' ? (
            <section className="mt-8 rounded-[28px] border border-rose-200 bg-rose-50/90 p-6 shadow-sm dark:border-rose-950/70 dark:bg-rose-950/30">
              <h2 className="text-xl font-semibold text-rose-950 dark:text-rose-100">
                {t('games.empty.title')}
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-rose-900/90 dark:text-rose-100/80">
                {errorMessage}
              </p>
            </section>
          ) : null}

          {status === 'ready' && dashboard ? (
            <>
              <section className="mt-10">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
                      {t('games.featured.eyebrow')}
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                      {t('games.featured.title')}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {t('games.featured.description')}
                    </p>
                  </div>
                </div>

                {dashboard.featured.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {dashboard.featured.map((game) => (
                      <FeaturedGameCard
                        key={game.appid}
                        game={game}
                        locale={locale}
                        reviewLabel={t('games.featured.reviewPositive')}
                        reviewCountLabel={t('games.featured.reviewCount')}
                        noReviewLabel={t('games.featured.noReview')}
                        lifetimeLabel={t('games.featured.lifetimeHours')}
                        achievementLabel={t('games.featured.achievements')}
                        noAchievementsLabel={t('games.featured.noAchievements')}
                        releaseDateLabel={t('games.featured.releaseDate')}
                        openStoreLabel={t('games.actions.openStore')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    {t('games.featured.noData')}
                  </div>
                )}
              </section>

              <section className="mt-10 rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                      {t('games.library.title')}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {t('games.library.showing', {
                        shown: formatInteger(visibleGames.length, locale),
                        total: formatInteger(filteredGames.length, locale),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="flex min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('games.library.searchPlaceholder')}
                        className="w-full min-w-[220px] bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </label>

                    <SelectMenu
                      value={sort}
                      options={sortOptions}
                      onValueChange={setSort}
                      label={t('games.library.sortLabel')}
                      ariaLabel={t('games.library.sortLabel')}
                      buttonClassName="min-w-[7rem]"
                    />
                  </div>
                </div>

                {visibleGames.length > 0 ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleGames.map((game) => {
                      const achievementProgress = getAchievementProgress(game)
                      const achievementPercent =
                        achievementProgress.totalCount > 0
                          ? Math.round(achievementProgress.ratio * 100)
                          : 0

                      return (
                        <article
                          key={game.appid}
                          className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),transparent_42%,rgba(14,165,233,0.09))] opacity-0 transition duration-300 group-hover:opacity-100" />

                          <div className="relative flex h-full flex-col">
                            <div className="flex items-start gap-3">
                              <GameIcon
                                name={game.name}
                                iconUrl={game.iconUrl}
                                className="h-14 w-14 shrink-0"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                                      {game.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                      {t('games.library.playtime', {
                                        hours: formatHours(
                                          game.playtimeMinutes,
                                          locale
                                        ),
                                      })}
                                    </p>
                                    {game.playtimeMinutes <= 0 ? (
                                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {t('games.library.neverPlayed')}
                                      </p>
                                    ) : game.recentPlaytimeMinutes > 0 ? (
                                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {t('games.library.recentPlaytime', {
                                          hours: formatHours(
                                            game.recentPlaytimeMinutes,
                                            locale
                                          ),
                                        })}
                                      </p>
                                    ) : null}
                                  </div>

                                  <a
                                    href={game.storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
                                    aria-label={t('games.actions.openStore')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {achievementProgress.totalCount > 0
                                  ? formatAchievementValue(
                                      game.achievementStats,
                                      locale
                                    )
                                  : t('games.library.achievementMissing')}
                              </p>

                              {achievementProgress.totalCount > 0 ? (
                                <p className="text-slate-500 dark:text-slate-400">
                                  {formatInteger(achievementPercent, locale)}%
                                </p>
                              ) : null}
                            </div>

                            <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              {achievementProgress.widthPercent > 0 ? (
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    achievementProgress.fillClassName
                                  )}
                                  style={{
                                    width: `${achievementProgress.widthPercent}%`,
                                  }}
                                />
                              ) : null}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                    {t('games.library.noResults')}
                  </div>
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </section>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
