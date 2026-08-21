import {
  getTwikooApi,
  loadTwikooScript,
  type TwikooRecentComment,
} from './twikooLoader'

export const RECENT_COMMENTS_CACHE_TTL_MS = 5 * 60 * 1000

export interface RecentCommentsQuery {
  envId: string
  urls: string[]
  pageSize: number
  includeReply: boolean
}

export interface CachedRecentComments {
  comments: TwikooRecentComment[]
  fetchedAt: number
  isFresh: boolean
}

interface RecentCommentsCacheEntry {
  comments: TwikooRecentComment[]
  fetchedAt: number
}

const SESSION_CACHE_KEY_PREFIX = 'mark-blog:recent-comments:v1:'
const memoryCache = new Map<string, RecentCommentsCacheEntry>()
const inFlightRequests = new Map<string, Promise<TwikooRecentComment[]>>()

function getCacheKey(query: RecentCommentsQuery) {
  return [query.envId, query.pageSize, query.includeReply, ...query.urls].join(
    '|'
  )
}

function getSessionCacheKey(cacheKey: string) {
  return `${SESSION_CACHE_KEY_PREFIX}${cacheKey}`
}

function isCacheEntry(value: unknown): value is RecentCommentsCacheEntry {
  if (!value || typeof value !== 'object') return false

  const entry = value as Partial<RecentCommentsCacheEntry>
  return (
    Array.isArray(entry.comments) &&
    typeof entry.fetchedAt === 'number' &&
    Number.isFinite(entry.fetchedAt)
  )
}

function readCachedEntry(cacheKey: string) {
  const memoryEntry = memoryCache.get(cacheKey)
  if (memoryEntry) return memoryEntry

  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(getSessionCacheKey(cacheKey))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isCacheEntry(parsed)) return null

    memoryCache.set(cacheKey, parsed)
    return parsed
  } catch {
    return null
  }
}

function writeCachedEntry(cacheKey: string, entry: RecentCommentsCacheEntry) {
  memoryCache.set(cacheKey, entry)

  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(
      getSessionCacheKey(cacheKey),
      JSON.stringify(entry)
    )
  } catch {
    // The in-memory cache still protects SPA navigation if storage is blocked.
  }
}

export function getCachedRecentComments(
  query: RecentCommentsQuery
): CachedRecentComments | null {
  const entry = readCachedEntry(getCacheKey(query))
  if (!entry) return null

  return {
    ...entry,
    isFresh: Date.now() - entry.fetchedAt < RECENT_COMMENTS_CACHE_TTL_MS,
  }
}

export function loadRecentComments(
  query: RecentCommentsQuery
): Promise<TwikooRecentComment[]> {
  const cacheKey = getCacheKey(query)
  const existingRequest = inFlightRequests.get(cacheKey)
  if (existingRequest) return existingRequest

  const request = (async () => {
    await loadTwikooScript()
    const twikooApi = getTwikooApi()
    if (!twikooApi?.getRecentComments) {
      throw new Error('Twikoo recent comments API is unavailable')
    }

    const comments = await twikooApi.getRecentComments(query)
    writeCachedEntry(cacheKey, {
      comments,
      fetchedAt: Date.now(),
    })
    return comments
  })()

  inFlightRequests.set(cacheKey, request)
  void request.then(
    () => inFlightRequests.delete(cacheKey),
    () => inFlightRequests.delete(cacheKey)
  )

  return request
}
