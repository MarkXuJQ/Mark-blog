import { Star } from 'lucide-react'
import { useState } from 'react'
import type { GithubStats, GithubTopRepo } from '@/lib/github/types'
import { cn } from '@/lib/classNames'
import { useSectionScrollProgress } from '@/hooks/useSectionScrollProgress'
import {
  FocusCity,
  type FocusDay,
  type FocusStats,
} from '@/components/ui/focus-city'

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
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="gh-card">
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
  const { ref, progress } = useSectionScrollProgress<HTMLElement>()

  const days: FocusDay[] = (data?.days ?? []).map((day) => ({
    date: day.date,
    count: day.count,
    level: day.level,
  }))

  const total = data?.totalCount ?? 0
  const activeDays = days.filter((day) => day.count > 0).length
  const repos = data?.topRepos ?? []
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
    hoveredLanguages ?? aggregateRepoLanguages(repos)
  const activeLabel = hoveredRepo ? hoveredRepo.name : strings.topReposLabel

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
                    <WindowStat
                      label={strings.bestStreakLabel ?? 'Best streak'}
                      value={`${stats.bestStreak}`}
                      hint={
                        stats.activeDays
                          ? `${stats.activeDays} ${strings.daysLabel ?? 'days'}`
                          : undefined
                      }
                    />
                  </div>

                  <div className="gh-divider" />

                  <div className="gh-repos">
                    <h3>{strings.topReposLabel}</h3>
                    {repos.length ? (
                      <ul>
                        {repos.map((repo) => (
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
                              <span className="gh-repo-desc">
                                {repo.description ||
                                  strings.emptyRepos}
                              </span>
                              <span className="gh-repo-meta">
                                {repo.language ? (
                                  <em>{repo.language}</em>
                                ) : null}
                                <span className="gh-repo-stars">
                                  <Star
                                    size={12}
                                    aria-hidden="true"
                                  />
                                  {repo.stars.toLocaleString()}
                                </span>
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

                  <div className="gh-repo-lang-strip">
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

            <div className="mark-lab-github__heatmap">
              <FocusCity
                days={days}
                progress={progress}
                autoMorph
                defaultView="auto"
                title=""
                description=""
                hideStats
                onStats={setFocusStats}
              />
              <div className="mark-lab-github__scroll-hint" aria-hidden="true">
                <span>{strings.scrollLabel1}</span>
                <span>{strings.scrollLabel2}</span>
                <span>{strings.scrollLabel3}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GithubShowcase