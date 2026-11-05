import {
  fetchGithubStats,
  getGithubConfig,
  GithubConfigError,
  GithubHttpError,
} from '../server/github-stats.js'

const responseCache = new Map()
const inflightRequests = new Map()
const LIVE_CACHE_TTL_MS = 1000 * 60 * 15
const FALLBACK_CACHE_TTL_MS = 1000 * 60 * 60 * 6

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
  res.setHeader(
    'CDN-Cache-Control',
    'public, s-maxage=1800, stale-while-revalidate=1800'
  )
  res.setHeader(
    'Vercel-CDN-Cache-Control',
    'public, s-maxage=1800, stale-while-revalidate=1800'
  )
  res.end(JSON.stringify(body))
}

function getCachedValue(key) {
  const entry = responseCache.get(key)
  if (!entry) return { hit: false }

  if (entry.expiresAt > Date.now()) {
    return { hit: true, value: entry.value }
  }

  responseCache.delete(key)
  return { hit: false }
}

async function getOrCreateCachedValue({ key, ttlMs, fetcher }) {
  const cached = getCachedValue(key)
  if (cached.hit) return cached.value

  const inflight = inflightRequests.get(key)
  if (inflight) return inflight

  const promise = fetcher()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + ttlMs })
      inflightRequests.delete(key)
      return value
    })
    .catch((error) => {
      inflightRequests.delete(key)
      throw error
    })

  inflightRequests.set(key, promise)
  return promise
}

async function resolveStatsPayload() {
  const config = getGithubConfig()

  // Without a token we return demo data — a real user should set GITHUB_TOKEN.
  if (!config.token) {
    const cacheKey = `${config.username}:demo`
    return getOrCreateCachedValue({
      cacheKey,
      ttlMs: FALLBACK_CACHE_TTL_MS,
      fetcher: () => fetchGithubStats(config),
    })
  }

  return getOrCreateCachedValue({
    cacheKey: `${config.username}:live`,
    ttlMs: LIVE_CACHE_TTL_MS,
    fetcher: () => fetchGithubStats(config),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, {
      code: 'METHOD_NOT_ALLOWED',
      error: 'Only GET is supported',
    })
  }

  try {
    const payload = await resolveStatsPayload()
    return json(res, 200, payload)
  } catch (error) {
    if (error instanceof GithubConfigError) {
      return json(res, 500, {
        code: error.code,
        error: error.message,
      })
    }

    if (error instanceof GithubHttpError) {
      if (error.status === 401 || error.status === 403) {
        return json(res, 502, {
          code: 'GITHUB_AUTH_FAILED',
          error: 'GitHub authentication failed',
        })
      }
      return json(res, 502, {
        code: error.code || 'GITHUB_UPSTREAM_ERROR',
        error: error.message,
      })
    }

    return json(res, 502, {
      code: 'GITHUB_NETWORK_ERROR',
      error: 'GitHub request failed',
    })
  }
}