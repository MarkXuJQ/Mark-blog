import { Star } from 'lucide-react'
import type { GithubStats } from '@/lib/github/types'
import { cn } from '@/lib/classNames'
import { useSectionScrollProgress } from '@/hooks/useSectionScrollProgress'
import { FocusCity, type FocusDay } from '@/components/ui/focus-city'

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

function StatCard({
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

function LanguageBar({ languages }: { languages: Record<string, number> }) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  return (
    <div className="gh-languages" aria-label="Language breakdown">
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

  return (
    <section
      ref={ref}
      className={cn('mark-lab-github', className)}
      aria-label={strings.moreOnGithub}
    >
      {/* Apple-style pinned scroll stage: the scene is sticky while the track
          scrolls, and the heatmap lifts from 2D to 3D as it reaches viewport
          center. The info column flows beside it, right → heatmap on the right. */}
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
                    <StatCard
                      label={strings.totalLabel}
                      value={total.toLocaleString()}
                    />
                    <StatCard
                      label={strings.streakLabel}
                      value={String(data.streak ?? 0)}
                    />
                    <StatCard
                      label={strings.daysLabel ?? 'Active days'}
                      value={String(activeDays)}
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

                  <LanguageBar languages={data.languages ?? {}} />

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