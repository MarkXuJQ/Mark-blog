const STEAM_API_BASE_URL = 'https://api.steampowered.com'
const STEAM_STORE_BASE_URL = 'https://store.steampowered.com'
const DEFAULT_STEAM_PROFILE_ID = '76561199085291248'
const FEATURED_GAME_LIMIT = 6
const ACHIEVEMENT_CONCURRENCY = 10

export class SteamHttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'SteamHttpError'
    this.status = status
  }
}

export class SteamConfigError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'SteamConfigError'
    this.code = code
  }
}

export function normalizeSteamProfileId(value) {
  const fallback = (value || DEFAULT_STEAM_PROFILE_ID).trim()
  return /^\d{17}$/.test(fallback) ? fallback : ''
}

export function getSteamConfig(env = process.env) {
  const apiKey = (env.STEAM_API_KEY || '').trim()
  const steamId = normalizeSteamProfileId(
    env.STEAM_PROFILE_ID || env.VITE_STEAM_PROFILE_ID || ''
  )

  return {
    apiKey,
    steamId: steamId || DEFAULT_STEAM_PROFILE_ID,
  }
}

function getSteamHeaders(apiKey) {
  return {
    accept: 'application/json',
    'x-webapi-key': apiKey,
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new SteamHttpError(response.status, `Steam HTTP ${response.status}`)
  }

  return response.json()
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new SteamHttpError(response.status, `Steam HTTP ${response.status}`)
  }

  return response.text()
}

function decodeXmlValue(value) {
  const trimmed = String(value || '').trim()
  const withoutCdata = trimmed.replace(
    /^<!\[CDATA\[([\s\S]*?)\]\]>$/i,
    '$1'
  )

  return withoutCdata
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim()
}

function readXmlTag(xml, tagName) {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i')
  const match = String(xml || '').match(pattern)
  return match ? decodeXmlValue(match[1]) : ''
}

function normalizeCommunityUrl(value) {
  return String(value || '').trim().replace(/^http:\/\//i, 'https://')
}

export async function fetchPlayerSummary(options) {
  const { apiKey, steamId } = options
  const url = new URL(`${STEAM_API_BASE_URL}/ISteamUser/GetPlayerSummaries/v2/`)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('steamids', steamId)

  const payload = await fetchJson(url, {
    headers: getSteamHeaders(apiKey),
  })

  return payload?.response?.players?.[0] ?? null
}

export async function fetchOwnedGames(options) {
  const { apiKey, steamId, includeAppInfo = true } = options
  const url = new URL(`${STEAM_API_BASE_URL}/IPlayerService/GetOwnedGames/v1/`)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('steamid', steamId)
  url.searchParams.set('include_played_free_games', '1')
  if (includeAppInfo) {
    url.searchParams.set('include_appinfo', '1')
  }

  const payload = await fetchJson(url, {
    headers: getSteamHeaders(apiKey),
  })

  return payload?.response ?? {}
}

async function fetchCommunityProfile(steamId) {
  const url = new URL(`https://steamcommunity.com/profiles/${steamId}/`)
  url.searchParams.set('xml', '1')

  const xml = await fetchText(url, {
    headers: { accept: 'application/xml, text/xml;q=0.9, */*;q=0.8' },
  })

  return {
    steamId: readXmlTag(xml, 'steamID64') || steamId,
    personaName: readXmlTag(xml, 'steamID') || 'Steam Player',
    avatarUrl:
      normalizeCommunityUrl(readXmlTag(xml, 'avatarFull')) ||
      normalizeCommunityUrl(readXmlTag(xml, 'avatarMedium')) ||
      normalizeCommunityUrl(readXmlTag(xml, 'avatarIcon')),
    profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
  }
}

function parseHoursToMinutes(rawValue) {
  const hours = Number.parseFloat(String(rawValue || '').trim())
  if (!Number.isFinite(hours) || hours <= 0) return 0
  return Math.round(hours * 60)
}

export async function fetchCommunityGames(steamId) {
  const url = new URL(`https://steamcommunity.com/profiles/${steamId}/games`)
  url.searchParams.set('tab', 'all')
  url.searchParams.set('xml', '1')

  const xml = await fetchText(url, {
    headers: { accept: 'application/xml, text/xml;q=0.9, */*;q=0.8' },
  })
  const gameBlocks = xml.match(/<game>[\s\S]*?<\/game>/gi) ?? []

  return gameBlocks
    .map((gameXml) => {
      const appId = Number.parseInt(readXmlTag(gameXml, 'appID'), 10)
      if (!Number.isFinite(appId) || appId <= 0) return null

      const logoUrl = normalizeCommunityUrl(readXmlTag(gameXml, 'logo'))

      return {
        appid: appId,
        name: readXmlTag(gameXml, 'name') || `App ${appId}`,
        playtimeMinutes: parseHoursToMinutes(readXmlTag(gameXml, 'hoursOnRecord')),
        recentPlaytimeMinutes: parseHoursToMinutes(
          readXmlTag(gameXml, 'hoursLast2Weeks')
        ),
        iconUrl: logoUrl,
        logoUrl,
        storeUrl: `https://store.steampowered.com/app/${appId}`,
        communityUrl: `https://steamcommunity.com/app/${appId}`,
      }
    })
    .filter(Boolean)
}

async function fetchReviewSummary(appId) {
  const url = new URL(`${STEAM_STORE_BASE_URL}/appreviews/${appId}`)
  url.searchParams.set('json', '1')
  url.searchParams.set('language', 'all')
  url.searchParams.set('purchase_type', 'all')
  url.searchParams.set('filter', 'all')
  url.searchParams.set('num_per_page', '1')

  try {
    const payload = await fetchJson(url, {
      headers: { accept: 'application/json' },
    })

    const querySummary = payload?.query_summary
    const totalPositive = Number(querySummary?.total_positive) || 0
    const totalNegative = Number(querySummary?.total_negative) || 0
    const totalReviews =
      Number(querySummary?.total_reviews) || totalPositive + totalNegative

    if (totalReviews <= 0) {
      return null
    }

    return {
      totalPositive,
      totalNegative,
      totalReviews,
      positivePercent: Math.round((totalPositive / totalReviews) * 100),
    }
  } catch {
    return null
  }
}

async function fetchStoreDetails(appId) {
  const url = new URL(`${STEAM_STORE_BASE_URL}/api/appdetails`)
  url.searchParams.set('appids', String(appId))
  url.searchParams.set('l', 'english')

  try {
    const payload = await fetchJson(url, {
      headers: { accept: 'application/json' },
    })

    const appEntry = payload?.[String(appId)]
    if (!appEntry?.success || !appEntry?.data) {
      return null
    }

    const data = appEntry.data

    return {
      headerImage: typeof data.header_image === 'string' ? data.header_image : '',
      shortDescription:
        typeof data.short_description === 'string' ? data.short_description : '',
      releaseDate:
        typeof data.release_date?.date === 'string' ? data.release_date.date : '',
      developers: Array.isArray(data.developers)
        ? data.developers.filter((item) => typeof item === 'string').slice(0, 3)
        : [],
      genres: Array.isArray(data.genres)
        ? data.genres
            .map((item) =>
              item && typeof item.description === 'string' ? item.description : ''
            )
            .filter(Boolean)
            .slice(0, 3)
        : [],
    }
  } catch {
    return null
  }
}

export async function fetchAchievementStats(options) {
  const { apiKey, steamId, appId } = options
  const url = new URL(
    `${STEAM_API_BASE_URL}/ISteamUserStats/GetPlayerAchievements/v1/`
  )
  url.searchParams.set('key', apiKey)
  url.searchParams.set('steamid', steamId)
  url.searchParams.set('appid', String(appId))

  try {
    const payload = await fetchJson(url, {
      headers: {
        ...getSteamHeaders(apiKey),
        accept: 'application/json',
      },
    })
    const achievements = Array.isArray(payload?.playerstats?.achievements)
      ? payload.playerstats.achievements
      : []

    if (achievements.length <= 0) {
      return null
    }

    const unlockedCount = achievements.reduce((count, achievement) => {
      return count + (Number(achievement?.achieved) === 1 ? 1 : 0)
    }, 0)

    return {
      unlockedCount,
      totalCount: achievements.length,
    }
  } catch {
    return null
  }
}

function buildCommunityAssetUrl(appId, assetHash) {
  const hash = typeof assetHash === 'string' ? assetHash.trim() : ''
  if (!hash) return ''
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`
}

export function normalizeOwnedGame(game) {
  const appId = Number.parseInt(String(game?.appid ?? ''), 10)
  if (!Number.isFinite(appId) || appId <= 0) {
    return null
  }

  const playtimeMinutes = Number(game?.playtime_forever) || 0
  const recentPlaytimeMinutes = Number(game?.playtime_2weeks) || 0

  return {
    appid: appId,
    name: typeof game?.name === 'string' ? game.name : `App ${appId}`,
    playtimeMinutes,
    recentPlaytimeMinutes,
    iconUrl: buildCommunityAssetUrl(appId, game?.img_icon_url),
    logoUrl: buildCommunityAssetUrl(appId, game?.img_logo_url),
    storeUrl: `https://store.steampowered.com/app/${appId}`,
    communityUrl: `https://steamcommunity.com/app/${appId}`,
  }
}

export function normalizeProfile(player, steamId) {
  const profileUrl =
    typeof player?.profileurl === 'string' && player.profileurl
      ? player.profileurl
      : `https://steamcommunity.com/profiles/${steamId}/`

  return {
    steamId,
    personaName:
      typeof player?.personaname === 'string' && player.personaname
        ? player.personaname
        : 'Steam Player',
    avatarUrl:
      typeof player?.avatarfull === 'string' && player.avatarfull
        ? player.avatarfull
        : typeof player?.avatarmedium === 'string' && player.avatarmedium
          ? player.avatarmedium
          : typeof player?.avatar === 'string'
            ? player.avatar
            : '',
    profileUrl,
    reviewsUrl: `${profileUrl.replace(/\/?$/, '/')}recommended/`,
  }
}

export function sortGamesByPlaytime(games) {
  return [...games].sort((left, right) => {
    if (right.playtimeMinutes !== left.playtimeMinutes) {
      return right.playtimeMinutes - left.playtimeMinutes
    }

    if (right.recentPlaytimeMinutes !== left.recentPlaytimeMinutes) {
      return right.recentPlaytimeMinutes - left.recentPlaytimeMinutes
    }

    return left.name.localeCompare(right.name, 'en')
  })
}

function summarizeGames(games) {
  const totalMinutes = games.reduce((sum, game) => sum + game.playtimeMinutes, 0)
  const totalRecentMinutes = games.reduce(
    (sum, game) => sum + game.recentPlaytimeMinutes,
    0
  )
  const playedCount = games.filter((game) => game.playtimeMinutes > 0).length

  return {
    gameCount: games.length,
    playedCount,
    unplayedCount: Math.max(0, games.length - playedCount),
    totalMinutes,
    totalRecentMinutes,
    totalUnlockedAchievements: 0,
    totalAvailableAchievements: 0,
    featuredAppId: games[0]?.appid ?? null,
  }
}

async function mapWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length))
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))

  return results
}

export async function fetchAchievementMap(options) {
  const { apiKey, steamId, games } = options
  if (!apiKey) return new Map()

  const playedGames = games.filter((game) => game.playtimeMinutes > 0)
  const pairs = await mapWithConcurrency(
    playedGames,
    async (game) => [
      game.appid,
      await fetchAchievementStats({
        apiKey,
        steamId,
        appId: game.appid,
      }),
    ],
    ACHIEVEMENT_CONCURRENCY
  )

  return new Map(pairs.filter((entry) => entry[1]))
}

export function buildAchievementMapFromGames(games) {
  return new Map(
    games
      .map((game) => [game.appid, game.achievementStats ?? null])
      .filter((entry) => entry[1])
  )
}

export function mergeAchievementStatsIntoGames(games, achievementMap) {
  return games.map((game) => ({
    ...game,
    achievementStats: achievementMap.get(game.appid) ?? game.achievementStats ?? null,
  }))
}

export function summarizeAchievementMap(achievementMap) {
  let totalUnlockedAchievements = 0
  let totalAvailableAchievements = 0

  achievementMap.forEach((stats) => {
    totalUnlockedAchievements += Number(stats?.unlockedCount) || 0
    totalAvailableAchievements += Number(stats?.totalCount) || 0
  })

  return {
    totalUnlockedAchievements,
    totalAvailableAchievements,
  }
}

export function summarizeDashboard(games, achievementMap) {
  return {
    ...summarizeGames(games),
    ...summarizeAchievementMap(achievementMap),
  }
}

async function enrichFeaturedGames(games, achievementMap) {
  const candidates = games
    .filter((game) => game.playtimeMinutes > 0)
    .slice(0, FEATURED_GAME_LIMIT)

  const enriched = await Promise.all(
    candidates.map(async (game) => {
      const [reviewSummary, storeDetails] = await Promise.all([
        fetchReviewSummary(game.appid),
        fetchStoreDetails(game.appid),
      ])

      return {
        ...game,
        reviewSummary,
        achievementStats: achievementMap.get(game.appid) ?? game.achievementStats ?? null,
        headerImage: storeDetails?.headerImage || '',
        shortDescription: storeDetails?.shortDescription || '',
        releaseDate: storeDetails?.releaseDate || '',
        developers: storeDetails?.developers || [],
        genres: storeDetails?.genres || [],
      }
    })
  )

  return enriched
}

function ensureSteamConfig(config) {
  const { apiKey = '', steamId = DEFAULT_STEAM_PROFILE_ID } = config || {}

  if (!normalizeSteamProfileId(steamId)) {
    throw new SteamConfigError(
      'STEAM_BAD_PROFILE_ID',
      'Steam profile id must be a 17-digit numeric string'
    )
  }

  return {
    apiKey,
    steamId,
  }
}

function isPlaceholderGameName(value) {
  return /^App \d+$/i.test(String(value || '').trim())
}

function stripLegacyTimeToBeat(game) {
  if (!game) return game

  const { timeToBeat: _legacyTimeToBeat, ...nextGame } = game
  return nextGame
}

function mergeStaticGameWithLiveGame(staticGame, liveGame) {
  if (!staticGame) {
    return { ...liveGame }
  }

  if (!liveGame) {
    return stripLegacyTimeToBeat(staticGame)
  }

  const cleanStaticGame = stripLegacyTimeToBeat(staticGame)

  return {
    ...cleanStaticGame,
    ...liveGame,
    name:
      typeof liveGame.name === 'string' &&
      liveGame.name.trim() &&
      !isPlaceholderGameName(liveGame.name)
        ? liveGame.name
        : staticGame.name,
    iconUrl:
      typeof liveGame.iconUrl === 'string' && liveGame.iconUrl.trim()
        ? liveGame.iconUrl
        : staticGame.iconUrl,
    logoUrl:
      typeof liveGame.logoUrl === 'string' && liveGame.logoUrl.trim()
        ? liveGame.logoUrl
        : staticGame.logoUrl,
    storeUrl:
      typeof liveGame.storeUrl === 'string' && liveGame.storeUrl.trim()
        ? liveGame.storeUrl
        : staticGame.storeUrl,
    communityUrl:
      typeof liveGame.communityUrl === 'string' && liveGame.communityUrl.trim()
        ? liveGame.communityUrl
        : staticGame.communityUrl,
    achievementStats: staticGame.achievementStats ?? null,
  }
}

function mergeStaticAndLiveGames(staticGames, liveGames) {
  const mergedGames = new Map()

  staticGames.forEach((game) => {
    mergedGames.set(game.appid, stripLegacyTimeToBeat(game))
  })

  liveGames.forEach((game) => {
    const previous = mergedGames.get(game.appid) || null
    mergedGames.set(game.appid, mergeStaticGameWithLiveGame(previous, game))
  })

  return sortGamesByPlaytime(Array.from(mergedGames.values()))
}

function shouldRefreshAchievementStats(staticGame, liveGame) {
  if (!liveGame || liveGame.playtimeMinutes <= 0) {
    return false
  }

  if (!staticGame) {
    return true
  }

  if (!staticGame.achievementStats) {
    return true
  }

  return (
    Number(staticGame.playtimeMinutes) !== Number(liveGame.playtimeMinutes) ||
    Number(liveGame.recentPlaytimeMinutes) > 0
  )
}

function mergeFeaturedWithLiveGames(staticFeatured, liveGamesByAppId, achievementMap) {
  const mergedStaticFeatured = staticFeatured
    .slice(0, FEATURED_GAME_LIMIT)
    .map((game) => {
      const liveGame = liveGamesByAppId.get(game.appid)
      const mergedGame = mergeStaticGameWithLiveGame(game, liveGame)
      return {
        ...mergedGame,
        achievementStats:
          achievementMap.get(game.appid) ?? game.achievementStats ?? null,
      }
    })

  if (mergedStaticFeatured.length >= FEATURED_GAME_LIMIT) {
    return mergedStaticFeatured
  }

  const featuredIds = new Set(mergedStaticFeatured.map((game) => game.appid))
  const fallbackFeatured = sortGamesByPlaytime(Array.from(liveGamesByAppId.values()))
    .filter((game) => game.playtimeMinutes > 0)
    .filter((game) => !featuredIds.has(game.appid))
    .slice(0, FEATURED_GAME_LIMIT - mergedStaticFeatured.length)
    .map((game) => ({
      ...game,
      achievementStats: achievementMap.get(game.appid) ?? game.achievementStats ?? null,
      reviewSummary: null,
      headerImage: '',
      shortDescription: '',
      releaseDate: '',
      developers: [],
      genres: [],
    }))

  return [...mergedStaticFeatured, ...fallbackFeatured]
}

export async function createSteamStaticLibrary(config = getSteamConfig()) {
  const { apiKey, steamId } = ensureSteamConfig(config)

  let profile
  let games
  let achievementMap = new Map()
  let source

  if (apiKey) {
    const [player, ownedGamesResponse] = await Promise.all([
      fetchPlayerSummary({ apiKey, steamId }),
      fetchOwnedGames({ apiKey, steamId }),
    ])

    profile = normalizeProfile(player, steamId)
    games = sortGamesByPlaytime(
      (Array.isArray(ownedGamesResponse?.games) ? ownedGamesResponse.games : [])
        .map(normalizeOwnedGame)
        .filter(Boolean)
    )
    achievementMap = await fetchAchievementMap({
      apiKey,
      steamId,
      games,
    })
    source = 'webapi'
  } else {
    const [communityProfile, communityGames] = await Promise.all([
      fetchCommunityProfile(steamId),
      fetchCommunityGames(steamId),
    ])

    profile = {
      ...communityProfile,
      reviewsUrl: `${communityProfile.profileUrl.replace(/\/?$/, '/')}recommended/`,
    }
    games = sortGamesByPlaytime(communityGames)
    source = 'community_xml'
  }

  const gamesWithAchievements = mergeAchievementStatsIntoGames(games, achievementMap)
  const featured = await enrichFeaturedGames(gamesWithAchievements, achievementMap)

  return {
    generatedAt: new Date().toISOString(),
    source,
    profile,
    summary: summarizeDashboard(gamesWithAchievements, achievementMap),
    featured,
    games: gamesWithAchievements,
  }
}

export async function createSteamLiveDashboard(
  staticLibrary,
  config = getSteamConfig()
) {
  const { apiKey, steamId } = ensureSteamConfig(config)
  const {
    benchmarkSource: _legacyBenchmarkSource,
    benchmarkGeneratedAt: _legacyBenchmarkGeneratedAt,
    benchmarkMatchedCount: _legacyBenchmarkMatchedCount,
    ...baseLibrary
  } = staticLibrary || {}
  const staticGames = Array.isArray(staticLibrary?.games) ? staticLibrary.games : []
  const staticFeatured = Array.isArray(staticLibrary?.featured)
    ? staticLibrary.featured
    : []

  let liveGames
  if (apiKey) {
    const ownedGamesResponse = await fetchOwnedGames({
      apiKey,
      steamId,
      includeAppInfo: false,
    })
    liveGames = sortGamesByPlaytime(
      (Array.isArray(ownedGamesResponse?.games) ? ownedGamesResponse.games : [])
        .map(normalizeOwnedGame)
        .filter(Boolean)
    )
  } else {
    liveGames = sortGamesByPlaytime(await fetchCommunityGames(steamId))
  }

  const staticGamesByAppId = new Map(staticGames.map((game) => [game.appid, game]))
  const mergedGames = mergeStaticAndLiveGames(staticGames, liveGames)

  const changedGames = liveGames.filter((game) =>
    shouldRefreshAchievementStats(staticGamesByAppId.get(game.appid) ?? null, game)
  )

  const liveAchievementMap = apiKey
    ? await fetchAchievementMap({
        apiKey,
        steamId,
        games: changedGames,
      })
    : new Map()

  const achievementMap = buildAchievementMapFromGames(staticGames)
  liveAchievementMap.forEach((stats, appId) => {
    achievementMap.set(appId, stats)
  })

  const mergedGamesWithAchievements = mergeAchievementStatsIntoGames(
    mergedGames,
    achievementMap
  )
  const mergedGamesByAppId = new Map(
    mergedGamesWithAchievements.map((game) => [game.appid, game])
  )

  return {
    ...baseLibrary,
    generatedAt: new Date().toISOString(),
    snapshotGeneratedAt: staticLibrary?.generatedAt || '',
    liveGeneratedAt: new Date().toISOString(),
    summary: summarizeDashboard(mergedGamesWithAchievements, achievementMap),
    featured: mergeFeaturedWithLiveGames(
      staticFeatured,
      mergedGamesByAppId,
      achievementMap
    ),
    games: mergedGamesWithAchievements,
  }
}

export async function createSteamDashboard(config = getSteamConfig()) {
  return createSteamStaticLibrary(config)
}
