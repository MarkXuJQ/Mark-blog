import { Star } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GithubStats, GithubTopRepo } from '@/lib/github/types'
import { cn } from '@/lib/classNames'
import { useSectionScrollProgress } from '@/hooks/projects/useSectionScrollProgress'
import {
  FocusCity,
  type FocusDay,
  type FocusStats,
} from '@/components/projects/focus-city'

// At least this many hot-repo cards are shown even when the heatmap is short,
// so the block never collapses to a single lonely repo.
const MIN_HOT_REPOS = 3
// Max repo rows shown; 1-col → up to 4 repos, 2-col → up to 8 repos.
const MAX_ROWS = 4
// Above this viewport width the hot-repo grid uses two columns (up to 8 repos).
// Below it, a single column capped at MAX_ROWS.
const TWO_COL_BREAKPOINT = 1600

/** GitHub's official language colours, used for the per-language plot. */
const GH_LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'Jupyter Notebook': '#DA5B0B',
  SVG: '#ffb13b',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Dart: '#00B4AB',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Shell: '#89e051',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Elixir: '#6e4a7e',
  'F#': '#b845fc',
  Lua: '#000080',
  R: '#198CE7',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  MDX: '#fcb32c',
  Markdown: '#083fa1',
  JSON: '#292929',
  YAML: '#cb171e',
  Dockerfile: '#384d54',
}

const GH_LANG_DEFAULT_COLOR = '#8b949e'

/** Returns the GitHub colour for a language, falling back to a neutral grey. */
function langColor(name: string): string {
  return GH_LANG_COLORS[name] ?? GH_LANG_DEFAULT_COLOR
}

/** Sum byte counts and normalise to a sorted [name, ratio] list. */
function toRatios(languages: Record<string, number>) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1
  return entries.map(([name, value]) => ({
    name,
    ratio: value / total,
  }))
}

export type GithubShowcaseStrings = {
  title?: string
  description?: string
  moreOnGithub: string
  totalLabel: string
  streakLabel: string
  topReposLabel: string
  emptyRepos: string
  demoHint: string
  daysLabel?: string
  dailyAvgLabel?: string
  bestStreakLabel?: string
  windowLabel?: string
  repoLanguagesLabel?: string
  toggle3d: string
  toggle2d: string
  scrollLabel1: string
  scrollLabel2: string
  scrollLabel3: string
}

export interface GithubShowcaseProps {
  data: GithubStats | null
  status: 'loading' | 'ready' | 'error'
  strings: GithubShowcaseStrings
  className?: string
}

function LanguageBar({
  languages,
  compact = false,
}: {
  languages: Record<string, number>
  compact?: boolean
}) {
  const ratios = toRatios(languages)
  if (!ratios.length) return null
  return (
    <div
      className={cn('gh-languages', compact && 'gh-languages--compact')}
      aria-label="Language breakdown"
    >
      <ul>
        {ratios.map(({ name, ratio }) => (
          <li key={name}>
            <span
              className="gh-languages__dot"
              style={{ background: langColor(name) }}
            />
            <span>{name}</span>
            <strong>{Math.round(ratio * 100)}%</strong>
          </li>
        ))}
      </ul>
      <div className="gh-language-bar" aria-hidden="true">
        {ratios.map(({ name, ratio }) => (
          <i
            key={name}
            title={name}
            style={{
              width: `${ratio * 100}%`,
              background: langColor(name),
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** Aggregate the hot repos' language bytes into one map (all-repos view). */
function aggregateRepoLanguages(
  repos: GithubTopRepo[]
): Record<string, number> {
  const aggregate: Record<string, number> = {}
  for (const repo of repos) {
    if (repo.languages) {
      for (const [lang, bytes] of Object.entries(repo.languages)) {
        aggregate[lang] = (aggregate[lang] ?? 0) + bytes
      }
    } else if (repo.language) {
      aggregate[repo.language] = (aggregate[repo.language] ?? 0) + repo.stars
    }
  }
  return aggregate
}

function WindowStat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('gh-card', className)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}

export function GithubShowcase({
  data,
  status,
  strings,
  className,
}: GithubShowcaseProps) {
  const { ref, progress: sectionProgress } = useSectionScrollProgress<HTMLElement>()

  // The progress that drives the 2D -> 3D lift differs by layout:
  //  • Wide screens use the pinned scroll track — the stage is sticky and stays
  //    centered while the section scrolls, so the heatmap's own viewport offset
  //    is constant and useless. Section progress is the right signal there.
  //  • On mobile (≤820px) the layout stacks vertically (side column above, heatmap
  //    below) and the section spans far more than the heatmap. Section progress
  //    can hit 0.5 while the heatmap is still far below the fold, lifting the
  //    city a beat too early. We measure the heatmap's own viewport progress so
  //    it lifts exactly as it scrolls into center.
  const heatmapRef = useRef<HTMLDivElement>(null)
  const [heatmapProgress, setHeatmapProgress] = useState(0)
  const [isStacked, setIsStacked] = useState(false)
  useEffect(() => {
    const set = () => setIsStacked(window.innerWidth <= 820)
    set()
    window.addEventListener('resize', set)
    return () => window.removeEventListener('resize', set)
  }, [])
  useEffect(() => {
    const node = heatmapRef.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHeatmapProgress(1)
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const rect = node.getBoundingClientRect()
      const viewport = window.innerHeight
      // 0 while the heatmap's bottom is still below the viewport top, then ramps
      // to 1 as it rises; ~0.5 means roughly centered — the city lift point.
      const entered = viewport - rect.bottom + rect.height / 2
      const clamped = Math.max(0, Math.min(1, entered / (viewport * 0.8)))
      setHeatmapProgress(clamped)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [status, data])

  const progress = isStacked ? heatmapProgress : sectionProgress

  const days: FocusDay[] = (data?.days ?? []).map((day) => ({
    date: day.date,
    count: day.count,
    level: day.level,
  }))

  const total = data?.totalCount ?? 0
  const activeDays = days.filter((day) => day.count > 0).length
  const repos = data?.topRepos ?? []

  // How many hot-repo cards to surface is a pure function of viewport width,
  // per the spec: phones / narrow desktops get a single column (capped at
  // MAX_ROWS = 4, at least MIN_HOT_REPOS); wide screens fan into two columns
  // (up to 2 × MAX_ROWS = 8 repos). No height coupling — react to width only.
  const [visibleCount, setVisibleCount] = useState(repos.length)

  useEffect(() => {
    const apply = () => {
      const cols = window.innerWidth >= TWO_COL_BREAKPOINT ? 2 : 1
      const target = Math.min(cols * MAX_ROWS, repos.length)
      const next = Math.max(MIN_HOT_REPOS, target)
      setVisibleCount((prev) => (prev === next ? prev : next))
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
    // `repos.length` drives the ceiling; re-run when the data set changes size.
  }, [repos.length])

  const visibleRepos =
    visibleCount >= repos.length ? repos : repos.slice(0, visibleCount)
  const [focusStats, setFocusStats] = useState<FocusStats | null>(null)
  const [hoveredRepo, setHoveredRepo] = useState<GithubTopRepo | null>(null)

  const stats = focusStats ?? {
    total,
    dailyAverage: activeDays ? total / activeDays : 0,
    bestStreak: 0,
    activeDays,
    days: 0,
    weeks: 0,
  }

  // Language breakdown: show the hovered repo's proportions, otherwise the
  // aggregate over all hot repos.
  const hoveredLanguages =
    hoveredRepo &&
    hoveredRepo.languages &&
    Object.keys(hoveredRepo.languages).length > 0
      ? hoveredRepo.languages
      : null
  const activeLanguages =
    hoveredLanguages ?? aggregateRepoLanguages(visibleRepos)
  const activeLabel = hoveredRepo ? hoveredRepo.name : strings.topReposLabel

  // Reserve a stable height for the language strip so hovering a repo never
  // reflows the list above it (which otherwise makes the cursor "tick" as the
  // item underneath keeps changing). We measure the strip's natural height for
  // the aggregate view (the union of every repo's languages, i.e. the tallest
  // case) and pin the container to that exact height; single-repo hover views
  // slot in without resizing the column.
  const stripRef = useRef<HTMLDivElement>(null)
  const [stripLockHeight, setStripLockHeight] = useState<number | null>(null)

  // The currently-active languages drive the strip's on-screen content; when a
  // repo is hovered we compare against the reserved aggregate so the container
  // height never changes.
  const aggregateLanguages = useMemo(
    () => aggregateRepoLanguages(visibleRepos),
    [visibleRepos]
  )

  // Measure the strip's natural height in the aggregate (no-hover) state and
  // freeze it, while re-measuring if the data set or viewport changes. We only
  // lock when the current content matches the aggregate so we capture the
  // tallest footprint; hover swaps happen without a resize.
  useLayoutEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const measure = () => {
      // Only ever raise the reserved height to the tallest content seen (the
      // aggregate is the union and thus tallest); never shrink it, so hover
      // swaps never reflow the column above.
      setStripLockHeight((prev) => {
        const natural = strip.scrollHeight
        if (natural > (prev ?? 0)) return natural
        return prev
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(strip)
    return () => ro.disconnect()
  }, [aggregateLanguages, hoveredLanguages])

  return (
    <section
      ref={ref}
      className={cn('mark-lab-github', className)}
      aria-label={strings.moreOnGithub}
    >
      {/* Apple-style pinned scroll stage: the scene is sticky while the track
          scrolls, and the heatmap lifts from 2D to 3D as it reaches viewport
          center. The info column flows on the left; the heatmap with its
          date-range + 2D/3D switches stays on the right. */}
      <div className="mark-lab-github__track">
        <div className="mark-lab-github__stage">
          <div className="mark-lab-github__layout">
            <div className="mark-lab-github__side">
              {status === 'loading' ? (
                <div className="mark-lab-github__loading" role="status">
                  <span aria-hidden="true" />
                  {strings.totalLabel}
                </div>
              ) : status === 'error' || !data ? (
                <div className="mark-lab-github__error">
                  <p>{strings.emptyRepos}</p>
                </div>
              ) : (
                <>
                  <div className="gh-stats-grid">
                    <WindowStat
                      label={strings.totalLabel}
                      value={stats.total.toLocaleString()}
                      hint={stats.weeks ? `${stats.days} ${strings.daysLabel ?? 'days'}` : undefined}
                    />
                    <WindowStat
                      label={strings.dailyAvgLabel ?? 'Daily average'}
                      value={stats.dailyAverage.toFixed(1)}
                      hint={
                        stats.weeks
                          ? `${stats.weeks} ${strings.windowLabel ?? 'weeks'}`
                          : undefined
                      }
                    />
                    {/* The best-streak card is dropped on narrow screens: on a
                        small column there isn't room for all three stats, and
                        the streak is the least essential of them. Hidden via
                        `.gh-card--best` in CSS. */}
                    <WindowStat
                      label={strings.bestStreakLabel ?? 'Best streak'}
                      value={`${stats.bestStreak}`}
                      hint={
                        stats.activeDays
                          ? `${stats.activeDays} ${strings.daysLabel ?? 'days'}`
                          : undefined
                      }
                      className="gh-card--best"
                    />
                  </div>

                  <div className="gh-repos">
                    <h3>{strings.topReposLabel}</h3>
                    {visibleRepos.length ? (
                      <ul className="gh-repos__grid">
                        {visibleRepos.map((repo) => (
                          <li key={repo.name}>
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onMouseEnter={() => setHoveredRepo(repo)}
                              onMouseLeave={() => setHoveredRepo(null)}
                              onFocus={() => setHoveredRepo(repo)}
                              onBlur={() => setHoveredRepo(null)}
                            >
                              <span className="gh-repo-name">
                                {repo.name}
                              </span>
                              <span className="gh-repo-meta">
                                <span className="gh-repo-stars">
                                  <Star
                                    size={12}
                                    aria-hidden="true"
                                  />
                                  {repo.stars.toLocaleString()}
                                </span>
                              </span>
                              <span className="gh-repo-desc">
                                {repo.description ||
                                  strings.emptyRepos}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="gh-repos-empty">
                        {strings.emptyRepos}
                      </p>
                    )}
                  </div>

                  <div
                    ref={stripRef}
                    className="gh-repo-lang-strip"
                    style={
                      stripLockHeight
                        ? { minHeight: `${stripLockHeight}px` }
                        : undefined
                    }
                  >
                    <div className="gh-repo-lang-strip__head">
                      <span>
                        {strings.repoLanguagesLabel ?? 'Languages'}
                      </span>
                      <em>{activeLabel}</em>
                    </div>
                    {Object.keys(activeLanguages).length ? (
                      <LanguageBar languages={activeLanguages} />
                    ) : (
                      <p className="gh-repo-lang-strip__empty">
                        {strings.emptyRepos}
                      </p>
                    )}
                  </div>

                  {data.source === 'demo' ? (
                    <p className="mark-lab-github__demo-hint">
                      {strings.demoHint}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div ref={heatmapRef} className="mark-lab-github__heatmap">
              <FocusCity
                days={days}
                progress={progress}
                autoMorph
                defaultView="auto"
                title=""
                description=""
                hideStats
                hideChrome
                onStats={setFocusStats}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GithubShowcase