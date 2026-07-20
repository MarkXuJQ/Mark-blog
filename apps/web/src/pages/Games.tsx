import {
  Clock3,
  ExternalLink,
  Gamepad2,
  Search,
  TimerReset,
  Trophy,
  X,
} from 'lucide-react'
import {
  startTransition,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { Seo } from '@/components/seo/Seo'
import { Pagination } from '@/components/ui/Pagination'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { cn } from '@/lib/utils'

type LoadStatus = 'loading' | 'ready' | 'error'
type GameSort = 'playtime' | 'recent' | 'achievements'

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
  storeUrl: string
  achievementStats: SteamAchievementStats | null
}

interface SteamFeaturedGame extends SteamGame {
  headerImage: string
  releaseDate: string
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
const FEATURED_RAIL_DEFAULT_SPEED_PERCENT = 50
const FEATURED_RAIL_FIXED_SPEED_PERCENT = 20
const FEATURED_RAIL_BASE_DURATION_SECONDS = 42
const FEATURED_RAIL_DRAG_CLICK_THRESHOLD = 6
const GAME_SHOWCASE_TILT_MAX_DEGREES = 8.5

interface FeaturedRailDragState {
  pointerId: number
  startX: number
  startOffset: number
  hasDragged: boolean
}

function normalizeRailOffset(offset: number, loopWidth: number) {
  if (loopWidth <= 0) return 0

  const positiveOffset = ((offset % loopWidth) + loopWidth) % loopWidth
  return positiveOffset === 0 ? 0 : positiveOffset - loopWidth
}

async function fetchSteamDashboard() {
  const response = await fetch('/api/steam')
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new SteamDashboardError({
      status: response.status,
      code:
        typeof payload?.code === 'string'
          ? payload.code
          : 'STEAM_REQUEST_FAILED',
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

function getSteamLibraryCoverUrl(appid: number) {
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`
}

function buildInitials(name: string) {
  const chars = Array.from(name.trim())
  if (chars.length === 0) return 'GM'
  return chars.slice(0, 2).join('').toUpperCase()
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
      fillClassName: 'bg-emerald-400',
    }
  }

  if (ratio < 0.6) {
    return {
      unlockedCount,
      totalCount,
      ratio,
      widthPercent,
      fillClassName: 'bg-emerald-600',
    }
  }

  if (ratio < 1) {
    return {
      unlockedCount,
      totalCount,
      ratio,
      widthPercent,
      fillClassName: 'bg-sky-500',
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
    <div className="rounded-[1.4rem] border border-slate-200/70 bg-white/75 p-3.5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur-sm sm:rounded-3xl sm:p-4 dark:border dark:border-white/8 dark:bg-[#101215] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_32px_-28px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-[0.65rem] leading-snug font-semibold tracking-[0.16em] text-slate-500 uppercase sm:text-xs sm:tracking-[0.24em] dark:text-slate-300">
          {label}
        </p>
        <span className="shrink-0 text-slate-500 dark:text-slate-300">
          {icon}
        </span>
      </div>

      <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-950 sm:mt-3 sm:text-3xl dark:text-slate-50">
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
          'overflow-hidden rounded-2xl bg-slate-950/5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] dark:bg-slate-900/50 dark:shadow-none',
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
        'flex items-center justify-center rounded-2xl bg-emerald-600 font-semibold text-white shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] dark:shadow-none',
        className
      )}
      aria-hidden="true"
    >
      <span>{buildInitials(name)}</span>
    </div>
  )
}

function FeaturedGameMetric({
  label,
  value,
}: {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div className="min-w-0 border-l border-white/15 px-2 first:border-l-0 first:pl-0 last:pr-0 sm:px-3">
      <p className="min-h-6 text-[9px] leading-3 break-words text-slate-300 uppercase sm:text-[10px]">
        {label}
      </p>
      <p className="mt-0.5 min-h-8 text-xs leading-4 font-semibold break-words text-slate-100 tabular-nums sm:text-sm">
        {value}
      </p>
    </div>
  )
}

function FeaturedGameCard(props: {
  game: SteamFeaturedGame
  locale: string
  lifetimeLabel: string
  achievementLabel: string
  noAchievementsLabel: string
  releaseDateLabel: string
  ariaHidden?: boolean
}) {
  const {
    game,
    locale,
    lifetimeLabel,
    achievementLabel,
    noAchievementsLabel,
    releaseDateLabel,
    ariaHidden,
  } = props

  return (
    <article
      aria-hidden={ariaHidden}
      className="group relative min-h-[252px] w-[calc(100vw-3.25rem)] flex-none overflow-hidden rounded-[24px] bg-slate-950 text-white shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.9)] sm:w-[30rem] lg:w-[32rem] dark:shadow-none"
    >
      {game.headerImage ? (
        <img
          src={game.headerImage}
          alt={game.name}
          width={920}
          height={430}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
        />
      ) : null}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.42)_48%,rgba(2,6,23,0.88)_100%)]" />

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <GameIcon
            name={game.name}
            iconUrl={game.iconUrl}
            className="h-11 w-11 shrink-0 bg-white/10 sm:h-12 sm:w-12"
          />

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xl leading-tight font-semibold text-white sm:text-2xl">
              {game.name}
            </h3>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 border-t border-white/18 pt-2.5">
          <FeaturedGameMetric
            label={releaseDateLabel}
            value={game.releaseDate || '—'}
          />
          <FeaturedGameMetric
            label={achievementLabel}
            value={
              game.achievementStats
                ? formatAchievementValue(game.achievementStats, locale)
                : noAchievementsLabel
            }
          />
          <FeaturedGameMetric
            label={lifetimeLabel}
            value={formatHours(game.playtimeMinutes, locale)}
          />
        </div>
      </div>
    </article>
  )
}

function FeaturedGameRail(props: {
  games: SteamFeaturedGame[]
  locale: string
  labels: {
    lifetimeLabel: string
    achievementLabel: string
    noAchievementsLabel: string
    releaseDateLabel: string
  }
}) {
  const { games, locale, labels } = props
  const shouldReduceMotion = Boolean(useReducedMotion())
  const railTrackRef = useRef<HTMLDivElement | null>(null)
  const railOffsetRef = useRef(0)
  const railLoopWidthRef = useRef(0)
  const railLastFrameTimeRef = useRef<number | null>(null)
  const railDragStateRef = useRef<FeaturedRailDragState | null>(null)
  const suppressClickRef = useRef(false)
  const [isDraggingRail, setIsDraggingRail] = useState(false)

  useEffect(() => {
    const railTrackNode = railTrackRef.current
    if (!railTrackNode) return

    let frameId = 0
    let resizeFrameId = 0

    const applyRailOffset = () => {
      railTrackNode.style.transform = `translate3d(${railOffsetRef.current}px, 0, 0)`
    }

    const syncLoopWidth = () => {
      window.cancelAnimationFrame(resizeFrameId)
      resizeFrameId = window.requestAnimationFrame(() => {
        const loopWidth = railTrackNode.scrollWidth / 2
        railLoopWidthRef.current = loopWidth
        railOffsetRef.current = normalizeRailOffset(
          railOffsetRef.current,
          loopWidth
        )
        applyRailOffset()
      })
    }

    const tick = (timestamp: number) => {
      const previousTimestamp = railLastFrameTimeRef.current
      railLastFrameTimeRef.current = timestamp

      if (
        previousTimestamp != null &&
        !shouldReduceMotion &&
        !railDragStateRef.current
      ) {
        const loopWidth = railLoopWidthRef.current
        const speedMultiplier =
          FEATURED_RAIL_FIXED_SPEED_PERCENT /
          FEATURED_RAIL_DEFAULT_SPEED_PERCENT
        const distancePerMs =
          loopWidth / (FEATURED_RAIL_BASE_DURATION_SECONDS * 1000)
        const deltaMs = timestamp - previousTimestamp

        railOffsetRef.current = normalizeRailOffset(
          railOffsetRef.current - distancePerMs * speedMultiplier * deltaMs,
          loopWidth
        )
        applyRailOffset()
      }

      frameId = window.requestAnimationFrame(tick)
    }

    syncLoopWidth()
    frameId = window.requestAnimationFrame(tick)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(syncLoopWidth)

    resizeObserver?.observe(railTrackNode)
    window.addEventListener('load', syncLoopWidth)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(resizeFrameId)
      resizeObserver?.disconnect()
      window.removeEventListener('load', syncLoopWidth)
    }
  }, [shouldReduceMotion])

  const handleRailPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    railDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: railOffsetRef.current,
      hasDragged: false,
    }
    railLastFrameTimeRef.current = null
    setIsDraggingRail(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleRailPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = railDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaX = event.clientX - dragState.startX
    const loopWidth = railLoopWidthRef.current

    if (Math.abs(deltaX) > FEATURED_RAIL_DRAG_CLICK_THRESHOLD) {
      dragState.hasDragged = true
      suppressClickRef.current = true
    }

    railOffsetRef.current = normalizeRailOffset(
      dragState.startOffset + deltaX,
      loopWidth
    )

    if (railTrackRef.current) {
      railTrackRef.current.style.transform = `translate3d(${railOffsetRef.current}px, 0, 0)`
    }

    if (dragState.hasDragged) event.preventDefault()
  }

  const finishRailDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = railDragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    if (dragState.hasDragged) {
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 160)
    }

    railDragStateRef.current = null
    railLastFrameTimeRef.current = null
    setIsDraggingRail(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleRailClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  return (
    <div className="relative -mx-5 sm:mx-0">
      <div
        className={cn(
          'relative cursor-grab touch-pan-y overflow-hidden select-none',
          isDraggingRail && 'cursor-grabbing'
        )}
        onClickCapture={handleRailClickCapture}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={finishRailDrag}
        onPointerDown={handleRailPointerDown}
        onPointerMove={handleRailPointerMove}
        onPointerUp={finishRailDrag}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 sm:w-12 lg:w-16"
          style={{
            background:
              'linear-gradient(90deg, var(--page-background) 0%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 sm:w-12 lg:w-16"
          style={{
            background:
              'linear-gradient(270deg, var(--page-background) 0%, transparent 100%)',
          }}
        />

        <div
          ref={railTrackRef}
          className="flex w-max items-stretch will-change-transform"
        >
          <FeaturedGameRailSegment
            games={games}
            locale={locale}
            labels={labels}
          />
          <FeaturedGameRailSegment
            games={games}
            locale={locale}
            labels={labels}
            ariaHidden
          />
        </div>
      </div>
    </div>
  )
}

function FeaturedGameRailSegment({
  games,
  locale,
  labels,
  ariaHidden,
}: {
  games: SteamFeaturedGame[]
  locale: string
  labels: {
    lifetimeLabel: string
    achievementLabel: string
    noAchievementsLabel: string
    releaseDateLabel: string
  }
  ariaHidden?: boolean
}) {
  return (
    <div className="flex shrink-0 gap-3.5 pl-5 sm:gap-4 sm:pl-6 lg:pl-8">
      {games.map((game) => (
        <FeaturedGameCard
          key={`${ariaHidden ? 'ghost' : 'live'}-${game.appid}`}
          game={game}
          locale={locale}
          lifetimeLabel={labels.lifetimeLabel}
          achievementLabel={labels.achievementLabel}
          noAchievementsLabel={labels.noAchievementsLabel}
          releaseDateLabel={labels.releaseDateLabel}
          ariaHidden={ariaHidden}
        />
      ))}
      <div aria-hidden="true" className="w-px shrink-0" />
    </div>
  )
}

function GameShowcaseTile({
  game,
  locale,
  playtimeLabel,
  statusLabel,
  achievementLabel,
  achievementMissingLabel,
  openStoreLabel,
}: {
  game: SteamGame
  locale: string
  playtimeLabel: string
  statusLabel: string | null
  achievementLabel: string
  achievementMissingLabel: string
  openStoreLabel: string
}) {
  const achievementProgress = getAchievementProgress(game)
  const achievementPercent =
    achievementProgress.totalCount > 0
      ? Math.round(achievementProgress.ratio * 100)
      : 0
  const tileRef = useRef<HTMLAnchorElement | null>(null)

  const handlePointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const tile = tileRef.current
    if (!tile) return

    const rect = tile.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    const rotateX = -y * GAME_SHOWCASE_TILT_MAX_DEGREES
    const rotateY = x * GAME_SHOWCASE_TILT_MAX_DEGREES

    tile.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`
  }

  const resetTilt = () => {
    const tile = tileRef.current
    if (!tile) return

    tile.style.transform =
      'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)'
  }

  return (
    <a
      ref={tileRef}
      href={game.storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${openStoreLabel}: ${game.name}`}
      className="group relative block rounded-[13px] transition-[filter,transform] duration-200 ease-out outline-none [transform-style:preserve-3d] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#17191c]"
      onPointerLeave={resetTilt}
      onPointerMove={handlePointerMove}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[13px] bg-[linear-gradient(135deg,#0f172a_0%,#334155_48%,#0f766e_100%)] shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] transition-shadow duration-200 group-hover:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.75)] dark:shadow-none">
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-semibold text-white/80">
          {game.name}
        </div>

        <img
          src={getSteamLibraryCoverUrl(game.appid)}
          alt={game.name}
          width={600}
          height={900}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
        />

        <div className="absolute inset-x-2 top-2 translate-y-1 rounded-[10px] bg-slate-950/78 p-2.5 text-white opacity-0 shadow-lg backdrop-blur-md transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <p className="line-clamp-2 text-[0.68rem] leading-tight font-semibold">
            {game.name}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2 text-[0.66rem] text-slate-200/90">
            <span className="truncate">
              {achievementProgress.totalCount > 0
                ? achievementLabel
                : achievementMissingLabel}
            </span>
            {achievementProgress.totalCount > 0 ? (
              <span className="shrink-0 tabular-nums">
                {formatInteger(achievementPercent, locale)}%
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
            {achievementProgress.widthPercent > 0 ? (
              <div
                className={cn(
                  'h-full rounded-full',
                  achievementProgress.fillClassName
                )}
                style={{ width: `${achievementProgress.widthPercent}%` }}
              />
            ) : null}
          </div>

          {statusLabel ? (
            <p className="mt-2 line-clamp-1 text-[0.62rem] font-medium text-cyan-100/95">
              {statusLabel}
            </p>
          ) : null}
        </div>

        <div className="absolute inset-x-2 bottom-2 flex justify-center">
          <span
            data-game-playtime-badge
            className="max-w-full truncate rounded-[8px] bg-slate-950/74 px-2.5 py-1 text-[0.68rem] font-semibold text-white shadow backdrop-blur-md"
          >
            {playtimeLabel}
          </span>
        </div>
      </div>
    </a>
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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [sort, setSort] = useState<GameSort>('playtime')
  const [currentPage, setCurrentPage] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

      if (sort === 'achievements') {
        const leftTotal = Number(left.achievementStats?.totalCount) || 0
        const rightTotal = Number(right.achievementStats?.totalCount) || 0
        const leftUnlocked = Number(left.achievementStats?.unlockedCount) || 0
        const rightUnlocked = Number(right.achievementStats?.unlockedCount) || 0
        const leftRatio = leftTotal > 0 ? leftUnlocked / leftTotal : 0
        const rightRatio = rightTotal > 0 ? rightUnlocked / rightTotal : 0
        if (rightRatio !== leftRatio) return rightRatio - leftRatio
        if (rightUnlocked !== leftUnlocked) return rightUnlocked - leftUnlocked
        if (right.playtimeMinutes !== left.playtimeMinutes) {
          return right.playtimeMinutes - left.playtimeMinutes
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

  const featuredGames = useMemo(
    () => dashboard?.featured ?? [],
    [dashboard?.featured]
  )
  const totalPages = Math.max(
    1,
    Math.ceil(filteredGames.length / ITEMS_PER_PAGE)
  )
  const hasSearch = search.trim().length > 0
  const isMobileSearchVisible = isMobileSearchOpen || hasSearch
  const searchInputId = 'games-library-search'

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!isMobileSearchOpen) return

    const frameId = requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [isMobileSearchOpen])

  const visibleGames = filteredGames.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const generatedAt = dashboard
    ? formatDateTime(dashboard.generatedAt, locale)
    : ''

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
    { value: 'achievements', label: t('games.sort.achievements') },
  ]

  return (
    <>
      <Seo title={title} description={description} />

      <div>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
          <section className="relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/82 p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur-xl sm:p-6 dark:border-0 dark:bg-[#17191c] dark:shadow-none">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-stretch">
              <div className="flex min-w-0 flex-col justify-between gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] bg-slate-100 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] ring-1 ring-slate-200/80 sm:h-24 sm:w-24 dark:bg-[#101215] dark:shadow-none dark:ring-white/10">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-white/70 dark:bg-white/20" />
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
                      <div className="flex h-full w-full items-center justify-center bg-emerald-600 text-2xl font-semibold text-white">
                        M
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold tracking-[0.28em] text-cyan-700 uppercase dark:text-cyan-300">
                      Steam Collection
                    </p>
                    <h1 className="mt-2 text-4xl leading-none font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-slate-50">
                      {dashboard
                        ? t('games.hero.title', {
                            name: dashboard.profile.personaName,
                          })
                        : title}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={dashboard?.profile.profileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-[12px] px-3.5 text-sm font-semibold transition',
                      dashboard
                        ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-white'
                        : 'pointer-events-none bg-slate-100 text-slate-400 dark:bg-[#23262c] dark:text-slate-500'
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('games.profile.openProfile')}
                  </a>

                  <a
                    href={dashboard?.profile.reviewsUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-[12px] border px-3.5 text-sm font-semibold transition',
                      dashboard
                        ? 'border-slate-200 bg-white/70 text-slate-800 hover:border-slate-300 hover:bg-white dark:border-[#2b2f36] dark:bg-[#101215] dark:text-slate-100 dark:hover:border-[#3a3f48]'
                        : 'pointer-events-none border-slate-200/80 bg-slate-100 text-slate-400 dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-500'
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('games.profile.openReviews')}
                  </a>

                  {generatedAt ? (
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t('games.hero.updatedAt', { date: generatedAt })}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <StatTile
                  label={t('games.stats.totalGames')}
                  value={formatInteger(
                    dashboard?.summary.gameCount ?? 0,
                    locale
                  )}
                  icon={<Gamepad2 className="h-5 w-5" />}
                />
                <StatTile
                  label={t('games.stats.totalHours')}
                  value={formatHours(
                    dashboard?.summary.totalMinutes ?? 0,
                    locale
                  )}
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
            <section className="mt-8 rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur dark:border-0 dark:bg-[#17191c] dark:shadow-none">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('games.loading')}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-[28px] bg-slate-100 dark:bg-[#23262c]"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {status === 'error' ? (
            <section className="mt-8 rounded-[28px] border border-rose-200/70 bg-rose-50/90 p-6 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-rose-950/30 dark:shadow-none">
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
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                      {t('games.featured.title')}
                    </h2>
                  </div>
                </div>

                {featuredGames.length > 0 ? (
                  <FeaturedGameRail
                    games={featuredGames}
                    locale={locale}
                    labels={{
                      lifetimeLabel: t('games.featured.lifetimeHours'),
                      achievementLabel: t('games.featured.achievements'),
                      noAchievementsLabel: t('games.featured.noAchievements'),
                      releaseDateLabel: t('games.featured.releaseDate'),
                    }}
                  />
                ) : (
                  <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-6 text-sm text-slate-600 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-[#17191c] dark:text-slate-400 dark:shadow-none">
                    {t('games.featured.noData')}
                  </div>
                )}
              </section>

              <section className="mt-10 rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur sm:p-6 dark:border-0 dark:bg-[#17191c] dark:shadow-none">
                <div className="relative">
                  <div className="hidden items-center justify-between gap-4 sm:flex">
                    <h2 className="min-w-0 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                      {t('games.library.title')}
                    </h2>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <label className="flex h-11 items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-3.5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] transition dark:border-[#2b2f36] dark:bg-[#17191c] dark:shadow-none">
                        <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                        <input
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={t('games.library.searchPlaceholder')}
                          className="w-[15rem] min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                        />

                        {hasSearch ? (
                          <button
                            type="button"
                            onClick={() => setSearch('')}
                            aria-label={t('games.library.clearSearch')}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-[#23262c] dark:hover:text-slate-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </label>

                      <SelectMenu
                        value={sort}
                        options={sortOptions}
                        onValueChange={setSort}
                        label={t('games.library.sortLabel')}
                        ariaLabel={t('games.library.sortLabel')}
                        className="shrink-0"
                        containerClassName="h-11 gap-1.5 rounded-[1.1rem] px-3 pr-2.5 sm:gap-2 sm:px-3.5 sm:pr-3"
                        labelClassName="hidden sm:inline"
                        buttonClassName="max-w-[6.8rem] gap-1 text-sm"
                        menuClassName="w-52 max-w-[calc(100vw-2rem)] z-[70]"
                      />
                    </div>
                  </div>

                  <div className="relative z-20 min-h-11 sm:hidden">
                    <div
                      className={cn(
                        'flex items-center justify-between gap-2 transition duration-200',
                        isMobileSearchVisible
                          ? 'pointer-events-none translate-x-3 opacity-0'
                          : 'translate-x-0 opacity-100'
                      )}
                    >
                      <h2 className="min-w-0 flex-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                        {t('games.library.title')}
                      </h2>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsMobileSearchOpen(true)}
                          aria-controls={searchInputId}
                          aria-expanded={isMobileSearchVisible}
                          aria-label={t('games.library.searchToggle')}
                          className="inline-flex h-11 max-w-[6.5rem] items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-500 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] transition hover:border-slate-300 hover:text-slate-700 hover:shadow-sm dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-300 dark:shadow-none dark:hover:border-[#3a3f48] dark:hover:text-slate-100"
                        >
                          <Search className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {t('games.library.searchToggle')}
                          </span>
                        </button>

                        <SelectMenu
                          value={sort}
                          options={sortOptions}
                          onValueChange={setSort}
                          label={t('games.library.sortLabel')}
                          ariaLabel={t('games.library.sortLabel')}
                          className="shrink-0"
                          containerClassName="h-11 gap-1 rounded-[1.1rem] px-3 pr-2.5"
                          labelClassName="hidden"
                          buttonClassName="max-w-[5.75rem] gap-1 text-sm"
                          menuClassName="w-52 max-w-[calc(100vw-2rem)] z-[70]"
                        />
                      </div>
                    </div>

                    <label
                      className={cn(
                        'absolute inset-0 flex h-11 min-w-0 items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-3 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] transition duration-200 dark:border-[#2b2f36] dark:bg-[#17191c] dark:shadow-none',
                        isMobileSearchVisible
                          ? 'translate-x-0 opacity-100'
                          : 'pointer-events-none translate-x-3 opacity-0'
                      )}
                    >
                      <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                      <input
                        ref={searchInputRef}
                        id={searchInputId}
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onBlur={() => {
                          if (!search) {
                            setIsMobileSearchOpen(false)
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Escape') return

                          if (search) {
                            setSearch('')
                            return
                          }

                          setIsMobileSearchOpen(false)
                        }}
                        placeholder={t('games.library.searchPlaceholder')}
                        className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          setIsMobileSearchOpen(false)
                        }}
                        aria-label={
                          search
                            ? t('games.library.clearSearch')
                            : t('games.library.closeSearch')
                        }
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-[#23262c] dark:hover:text-slate-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </label>
                  </div>

                  <p
                    className={cn(
                      'mt-2 text-sm text-slate-600 dark:text-slate-400',
                      isMobileSearchVisible ? 'hidden sm:block' : 'block'
                    )}
                  >
                    {t('games.library.showing', {
                      shown: formatInteger(visibleGames.length, locale),
                      total: formatInteger(filteredGames.length, locale),
                    })}
                  </p>
                </div>

                {visibleGames.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {visibleGames.map((game) => {
                      const playtimeLabel = t('games.library.playtime', {
                        hours: formatHours(game.playtimeMinutes, locale),
                      })
                      const statusLabel =
                        game.playtimeMinutes <= 0
                          ? t('games.library.neverPlayed')
                          : game.recentPlaytimeMinutes > 0
                            ? t('games.library.recentPlaytime', {
                                hours: formatHours(
                                  game.recentPlaytimeMinutes,
                                  locale
                                ),
                              })
                            : null
                      const achievementLabel =
                        game.achievementStats &&
                        game.achievementStats.totalCount > 0
                          ? formatAchievementValue(
                              game.achievementStats,
                              locale
                            )
                          : t('games.library.achievementMissing')

                      return (
                        <GameShowcaseTile
                          key={game.appid}
                          game={game}
                          locale={locale}
                          playtimeLabel={playtimeLabel}
                          statusLabel={statusLabel}
                          achievementLabel={achievementLabel}
                          achievementMissingLabel={t(
                            'games.library.achievementMissing'
                          )}
                          openStoreLabel={t('games.actions.openStore')}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-8 text-center text-sm text-slate-600 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-[#17191c] dark:text-slate-400 dark:shadow-none">
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
