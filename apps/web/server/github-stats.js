import process from 'node:process'

export const GITHUB_API_BASE_URL = 'https://api.github.com'
export const DEFAULT_GITHUB_USERNAME = 'MarkXuJQ'

export class GithubConfigError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'GithubConfigError'
    this.code = code
  }
}

export class GithubHttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'GithubHttpError'
    this.status = status
  }
}

export function getGithubConfig(env = process.env) {
  const token = (env.GITHUB_TOKEN || '').trim()
  const username = (env.GITHUB_USERNAME || DEFAULT_GITHUB_USERNAME).trim()

  return {
    token,
    username,
  }
}

async function githubFetch(url, token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'mark-blog',
  }
  if (token) headers.authorization = `Bearer ${token}`

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new GithubHttpError(response.status, `GitHub HTTP ${response.status}`)
  }

  return response.json()
}

async function githubGraphql(query, variables, token) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'user-agent': 'mark-blog',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new GithubHttpError(response.status, `GitHub HTTP ${response.status}`)
  }

  return response.json()
}

function countToLevel(minutes) {
  if (minutes === 0) return 0
  if (minutes < 60) return 1
  if (minutes < 120) return 2
  if (minutes < 180) return 3
  return 4
}

/**
 * Deterministic demo data so the projects page never breaks.
 * 84 days ending today, weekend-resting pattern with a healthy streak.
 */
export function createGithubDemoData(username) {
  const days = []
  const today = new Date()
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  )
  const count = 370

  for (let i = 0; i < count; i += 1) {
    const dayStart = todayUtc - (count - 1 - i) * 86400000
    const date = new Date(dayStart)
    const weekday = date.getUTCDay()
    // Back up the clock so a freshly deployed site isn't an empty grid.
    const index = count - 1 - i
    const weekend = weekday === 0 || weekday === 6
    const resting =
      index % 13 === 7 || index % 21 === 3 || (weekend && index % 4 === 0)
    let seed = Math.imul(index + 29, 0x8f8b5a61)
    seed = Math.imul(seed ^ (seed >>> 16), 0x8af57957)
    seed = (seed ^ (seed >>> 16)) >>> 0
    const total = resting
      ? 0
      : weekend
        ? 40 + (seed % 95)
        : 90 + (seed % 120)

    days.push({
      date: date.toISOString().slice(0, 10),
      count: total,
      level: countToLevel(total),
    })
  }

  return {
    username,
    source: 'demo',
    totalCount: days.reduce((sum, day) => sum + day.count, 0),
    days,
    topRepos: [
      {
        name: 'Mark-blog',
        url: `https://github.com/${username}/Mark-blog`,
        description: 'The site you are reading.',
        stars: 12,
        language: 'TypeScript',
        languages: { TypeScript: 58, CSS: 22, JavaScript: 12, HTML: 8 },
      },
      {
        name: 'hello-markxu',
        url: `https://github.com/${username}/hello-markxu`,
        description: 'A small social experiment.',
        stars: 8,
        language: 'TypeScript',
        languages: { TypeScript: 70, HTML: 20, CSS: 10 },
      },
      {
        name: 'china-province-svg-icons',
        url: `https://github.com/${username}/china-province-svg-icons`,
        description: 'SVG icons for Chinese provinces.',
        stars: 6,
        language: 'SVG',
        languages: { SVG: 88, JavaScript: 12 },
      },
    ],
    languages: { TypeScript: 60, SVG: 20, Dart: 10, CSS: 10 },
  }
}

const CONTRIBUTION_QUERY = `
query ($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`

function buildContributionDays(weeks, currentYearWeeks) {
  const map = new Map()
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      map.set(day.date, day.contributionCount)
    }
  }
  // currentYearWeeks are the same shape; merge preserves newest value.
  for (const week of currentYearWeeks) {
    for (const day of week.contributionDays) {
      map.set(day.date, day.contributionCount)
    }
  }

  // Keep the trailing N days (a full year so the client can render half-year
  // or full-year windows; the window shown is chosen client-side).
  const entries = [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )
  const end = entries.at(-1)?.[0]
  if (!end) return []

  const endTime = new Date(`${end}T00:00:00Z`).getTime()
  const start = new Date(endTime - 367 * 86400000).toISOString().slice(0, 10)

  return entries
    .filter(([date]) => date >= start)
    .map(([date, count]) => {
      const total = Math.max(0, count)
      return {
        date,
        count: total,
        level: countToLevel(total),
      }
    })
}

const REPO_QUERY = `
query ($username: String!) {
  user(login: $username) {
    repositories(
      first: 10
      orderBy: { field: STARGAZERS, direction: DESC }
      ownerAffiliations: [OWNER]
      isFork: false
    ) {
      nodes {
        name
        url
        description
        stargazerCount
        primaryLanguage { name }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node { name }
          }
        }
      }
    }
  }
}
`

export async function fetchGithubStats(config) {
  const { username, token } = config
  if (!username) {
    throw new GithubConfigError('GITHUB_BAD_USERNAME', 'GitHub username missing')
  }

  // Contribution calendar requires authentication.
  if (!token) {
    return createGithubDemoData(username)
  }

  const now = new Date()
  const to = now.toISOString()
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 364)
  ).toISOString()

  const [contributionResult, repoResult] = await Promise.all([
    githubGraphql(
      CONTRIBUTION_QUERY,
      { username, from, to },
      token
    ),
    githubGraphql(REPO_QUERY, { username }, token),
  ])

  if (contributionResult.errors?.length) {
    throw new GithubHttpError(
      502,
      contributionResult.errors.map((e) => e.message).join('; ')
    )
  }

  const collection =
    contributionResult.data?.user?.contributionsCollection
  const weeks = collection?.contributionCalendar?.weeks ?? []
  const totalContributions =
    collection?.contributionCalendar?.totalContributions ?? 0

  // Re-query the trailing 12 weeks without year filter so we get current
  // progress, then merge. (Typical when the calendar is split across years.)
  const currentStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 83)
  ).toISOString()
  const currentResult = await githubGraphql(
    CONTRIBUTION_QUERY,
    { username, from: currentStart, to },
    token
  )
  const currentWeeks =
    currentResult.data?.user?.contributionsCollection?.contributionCalendar
      ?.weeks ?? []

  const days = buildContributionDays(weeks, currentWeeks)

  const repoNodes =
    repoResult.data?.user?.repositories?.nodes?.filter(Boolean) ?? []
  // Only the user's own repos (no forks), most starred; the front-end then
  // shows however many fit next to the heatmap column.
  const sortedRepos = repoNodes
    .map((node) => {
      const languages = {}
      for (const edge of node.languages?.edges ?? []) {
        languages[edge.node.name] = edge.size
      }
      return {
        name: node.name,
        url: node.url,
        description: node.description ?? '',
        stars: node.stargazerCount ?? 0,
        language: node.primaryLanguage?.name ?? null,
        languages,
      }
    })
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 8)

  const topRepos = sortedRepos

  const languages = {}
  for (const repo of topRepos) {
    const lang = repo.language
    if (lang) languages[lang] = (languages[lang] ?? 0) + 1
  }

  // Compute streak from the trailing window.
  let streak = 0
  const active = days.filter((day) => day.count > 0)
  for (let i = active.length - 1; i >= 0; i -= 1) {
    const current = new Date(`${active[i].date}T00:00:00Z`).getTime()
    const prev = active[i - 1]
      ? new Date(`${active[i - 1].date}T00:00:00Z`).getTime()
      : null
    if (prev === null || current - prev <= 2 * 86400000) {
      streak += 1
    } else {
      break
    }
  }

  return {
    username,
    source: 'github',
    totalCount: totalContributions || days.reduce((s, d) => s + d.count, 0),
    days,
    topRepos,
    languages,
    streak,
  }
}