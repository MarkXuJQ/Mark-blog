import { createResponseCache } from '../server/responseCache.js'
import { createJsonResponder } from './http.js'
import {
  fetchGithubStats,
  getGithubConfig,
  GithubConfigError,
  GithubHttpError,
} from '../server/github-stats.js'

const LIVE_CACHE_TTL_MS = 1000 * 60 * 15
const FALLBACK_CACHE_TTL_MS = 1000 * 60 * 60 * 6
const responseCache = createResponseCache()

const cdnCacheControl =
  'public, s-maxage=1800, stale-while-revalidate=1800'
const json = createJsonResponder({
  cacheControl: 'public, max-age=300, must-revalidate',
  cdnCacheControl,
  vercelCacheControl: cdnCacheControl,
})

async function resolveStatsPayload() {
  const config = getGithubConfig()

  // Without a token we return demo data — a real user should set GITHUB_TOKEN.
  if (!config.token) {
    const cacheKey = `${config.username}:demo`
    return responseCache.getOrCreate({
      key: cacheKey,
      ttlMs: FALLBACK_CACHE_TTL_MS,
      fetcher: () => fetchGithubStats(config),
    })
  }

  return responseCache.getOrCreate({
    key: `${config.username}:live`,
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