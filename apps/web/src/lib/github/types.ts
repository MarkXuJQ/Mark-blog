export type GithubDay = {
  date: string
  count: number
  level: number
}

export type GithubTopRepo = {
  name: string
  url: string
  description: string
  stars: number
  language: string | null
  /** Byte counts per language, for a per-repo breakdown bar. */
  languages?: Record<string, number>
}

export type GithubStats = {
  username: string
  source: 'github' | 'demo'
  totalCount: number
  days: GithubDay[]
  topRepos: GithubTopRepo[]
  languages: Record<string, number>
  streak?: number
}