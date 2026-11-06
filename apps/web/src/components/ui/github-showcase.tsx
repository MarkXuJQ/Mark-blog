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
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  return (
    <div
      className={cn('gh-languages', compact && 'gh-languages--compact')}
      aria-label="Language breakdown"
    >
      <ul>
        {entries.map(([name, value]) => (
          <li key={name}>
            <span>{name}</span>
            <strong>{Math.round((value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
      <div className="gh-language-bar" aria-hidden="true">
        {entries.map(([name, value]) => (
          <i
            key={name}
            title={name}
            style={{ width: `${(value / total) * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
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
                            {/* Per-repo language proportions appear on hover
                                (or keyboard focus); falls back to the single
                                primary language otherwise. */}
                            {hoveredRepo?.name === repo.name &&
                            repo.languages &&
                            Object.keys(repo.languages).length > 0 ? (
                              <LanguageBar
                                languages={repo.languages}
                                compact
                              />
                            ) : (
                              <div className="gh-repo-lang--single">
                                {repo.language ?? '\u2014'}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="gh-repos-empty">
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