import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createResponseCache } from '../server/responseCache.js'
import { createJsonResponder } from './http.js'
import {
  createSteamLiveDashboard,
  createSteamStaticLibrary,
  getSteamConfig,
  normalizeSteamProfileId,
  SteamConfigError,
  SteamHttpError,
} from '../server/steam-dashboard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STATIC_LIBRARY_FILE_PATH = path.resolve(
  __dirname,
  '../../../content/games/steam-library.json'
)
const LIVE_DASHBOARD_CACHE_TTL_MS = 1000 * 60 * 60 * 2
const FALLBACK_DASHBOARD_CACHE_TTL_MS = 1000 * 60 * 60 * 24

const responseCache = {
  live: createResponseCache(),
  fallback: createResponseCache(),
}

const cdnCacheControl = 'public, s-maxage=86400, stale-while-revalidate=86400'
const json = createJsonResponder({
  cacheControl: 'public, max-age=7200, must-revalidate',
  cdnCacheControl,
  vercelCacheControl: cdnCacheControl,
})

async function readStoredLibrary() {
  const raw = await fs.readFile(STATIC_LIBRARY_FILE_PATH, 'utf-8')
  return JSON.parse(raw)
}

async function resolveDashboardFromStaticLibrary(staticLibrary, config) {
  const { apiKey, steamId } = config

  if (!normalizeSteamProfileId(steamId)) {
    return staticLibrary
  }

  const cacheKey = `${steamId}:${apiKey ? 'webapi' : 'community_xml'}:${staticLibrary.generatedAt || 'static'}`

  try {
    return await responseCache.live.getOrCreate({
      key: cacheKey,
      ttlMs: LIVE_DASHBOARD_CACHE_TTL_MS,
      fetcher: () => createSteamLiveDashboard(staticLibrary, config),
    })
  } catch {
    return staticLibrary
  }
}

async function resolveDashboardPayload() {
  const config = getSteamConfig()

  try {
    const staticLibrary = await readStoredLibrary()
    return resolveDashboardFromStaticLibrary(staticLibrary, config)
  } catch {
    if (!normalizeSteamProfileId(config.steamId)) {
      throw new SteamConfigError(
        'STEAM_BAD_PROFILE_ID',
        'Steam profile id must be a 17-digit numeric string'
      )
    }

    const cacheKey = `${config.steamId}:${config.apiKey ? 'webapi' : 'community_xml'}`

    return responseCache.fallback.getOrCreate({
      key: cacheKey,
      ttlMs: FALLBACK_DASHBOARD_CACHE_TTL_MS,
      fetcher: () => createSteamStaticLibrary(config),
    })
  }
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
    const payload = await resolveDashboardPayload()
    return json(res, 200, payload)
  } catch (error) {
    if (error instanceof SteamConfigError) {
      return json(res, 500, {
        code: error.code,
        error: error.message,
      })
    }

    if (error instanceof SteamHttpError) {
      if (error.status === 401 || error.status === 403) {
        return json(res, 502, {
          code: 'STEAM_AUTH_FAILED',
          error: 'Steam authentication failed',
        })
      }

      return json(res, 502, {
        code: 'STEAM_UPSTREAM_ERROR',
        error: error.message,
      })
    }

    return json(res, 502, {
      code: 'STEAM_NETWORK_ERROR',
      error: 'Steam request failed',
    })
  }
}
