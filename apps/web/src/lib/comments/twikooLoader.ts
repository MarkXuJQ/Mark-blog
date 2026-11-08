export interface TwikooApi {
  init: (options: {
    envId: string
    el: string
    path?: string
    /** Twikoo UI language, e.g. 'zh-cn' | 'en-us'. */
    lang?: string
    /**
     * Base URL for Twikoo 2's lazily imported `locales/<lang>.js` shards.
     * Defaults to the directory the bundle was loaded from.
     */
    localeBaseUrl?: string
    /** OwO emotion-pack JSON URL; replaces Twikoo's default pack. */
    EMOTION_CDN?: string
    onCommentLoaded?: () => void
  }) => void
  getCommentsCount: (options: {
    envId: string
    urls: string[]
    includeReply?: boolean
  }) => Promise<Array<{ url: string; count: number }>>
  getRecentComments?: (options: {
    envId: string
    urls?: string[]
    includeReply?: boolean
    pageSize?: number
  }) => Promise<TwikooRecentComment[]>
}

export interface TwikooRecentComment {
  id: string
  url: string
  nick: string
  created: number
  commentText?: string
}

declare global {
  interface Window {
    twikoo?: unknown
  }
}

/**
 * Twikoo 2 ships its CSS inside the JS bundle and lazily imports the UI strings
 * from `locales/<lang>.js` relative to the script URL, so the CDN path must keep
 * the `dist/locales/` directory reachable. jsDelivr serves those shards with
 * `Access-Control-Allow-Origin: *`, which the mirror does not for dynamic
 * imports. Bump `TWIKOO_VERSION` together with the cloud function.
 */
const TWIKOO_VERSION = '2.0.17'
const TWIKOO_SCRIPT_ID = 'twikoo-script'
const TWIKOO_SCRIPT_SRC = `https://cdn.jsdelivr.net/npm/twikoo@${TWIKOO_VERSION}/dist/twikoo.min.js`

/**
 * Directory Twikoo 2 resolves its lazily imported `locales/<lang>.js` shards
 * against (`<base>/locales/zh-cn.js`).
 */
export const TWIKOO_LOCALE_BASE_URL =
  'https://cdn.jsdelivr.net/npm/twikoo@' + TWIKOO_VERSION + '/dist'

let twikooLoadPromise: Promise<void> | null = null

export function getTwikooApi(): TwikooApi | null {
  if (typeof window === 'undefined') return null
  const candidate = window.twikoo
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as TwikooApi).init === 'function' &&
    typeof (candidate as TwikooApi).getCommentsCount === 'function'
  ) {
    return candidate as TwikooApi
  }
  return null
}

export interface EmotionPack {
  [group: string]: { type: string; container: Array<Record<string, string>> }
}

let emotionPackPromise: Promise<EmotionPack | null> | null = null

/**
 * Fetch and validate an OwO emotion pack.
 *
 * Static hosts often answer a missing path with the SPA's index.html (HTTP 200
 * with HTML), which would silently render an empty picker. So we verify the
 * payload really is a pack before handing it to Twikoo.
 */
export function loadEmotionPack(url: string): Promise<EmotionPack | null> {
  if (emotionPackPromise) return emotionPackPromise

  emotionPackPromise = (async () => {
    try {
      const res = await fetch(url, { credentials: 'omit' })
      if (!res.ok) return null
      return validateEmotionPack(await res.json())
    } catch {
      return null
    }
  })()

  return emotionPackPromise
}

function validateEmotionPack(data: unknown): EmotionPack | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const groups = Object.values(
    data as Record<string, { type?: unknown; container?: unknown }>
  )
  if (!groups.length) return null

  const valid = groups.every(
    (g) =>
      g &&
      typeof g === 'object' &&
      typeof g.type === 'string' &&
      Array.isArray(g.container) &&
      g.container.length > 0
  )
  return valid ? (data as EmotionPack) : null
}

let packFetchPatched = false

/**
 * Deterministically swap Twikoo's emotion pack.
 *
 * Twikoo fetches the pack from `config.EMOTION_CDN` (or its built-in default).
 * Racing that by patching `config` and calling `initOwo()` again is inherently
 * flaky: Twikoo replaces the whole config object when its asynchronous
 * GET_CONFIG arrives, and mounted-order varies between loads.
 *
 * Instead we intercept the request at its source: any request for an OwO JSON
 * gets answered with our validated pack. That makes the result identical on
 * every load, regardless of config timing, and leaves the admin's own
 * EMOTION_CDN untouched (we only stand in when it is unset).
 *
 * The patch is installed synchronously and the pack is fetched in parallel: the
 * comments themselves never wait for it, only Twikoo's own pack request does
 * (and it falls back to the network if the pack could not be loaded).
 *
 * Twikoo 1.x used a raw XMLHttpRequest, 2.x switched to `fetch`; both are hooked
 * so a cache holding either bundle keeps working.
 */
export function installEmotionPackInterceptor(emotionCdn: string): boolean {
  if (typeof window === 'undefined' || packFetchPatched) return false

  packFetchPatched = true
  // Resolves to the serialized pack, or null when it is unavailable.
  const packPromise = loadEmotionPack(emotionCdn).then((pack) =>
    pack ? JSON.stringify(pack) : null
  )

  const isEmotionPackUrl = (url: string) => {
    const isPackRequest =
      /(?:^|\/)(?:owo|emotions?)(?:[\w.-]*)\.json(?:\?|$)/i.test(url) ||
      /owo\.json/i.test(url)
    // Only answer for Twikoo's default pack. If the site configured its own
    // EMOTION_CDN, that URL is not the default one and is left alone.
    const isDefaultPack =
      /owo\.imaegoo\.com/i.test(url) || /\/emotions\/owo\.json/i.test(url)
    return isPackRequest && isDefaultPack
  }

  const originalFetch = window.fetch
  window.fetch = function (
    this: Window,
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url

    if (isEmotionPackUrl(rawUrl)) {
      // Serve our pack if we have it; otherwise let the request through.
      return packPromise.then((packJson) =>
        packJson
          ? new Response(packJson, {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          : originalFetch.call(window, input, init)
      )
    }

    return originalFetch.call(window, input, init)
  } as typeof window.fetch

  if (typeof XMLHttpRequest === 'undefined') return true

  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send

  // Remember the URL each request was opened with so send() can inspect it.
  const urlByXhr = new WeakMap<XMLHttpRequest, string>()

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    _method: string,
    url: string | URL
  ) {
    urlByXhr.set(this, String(url))
    // eslint-disable-next-line prefer-rest-params
    return originalOpen.apply(this, arguments as never)
  } as typeof XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    ...args: unknown[]
  ) {
    const url = urlByXhr.get(this) ?? ''

    if (isEmotionPackUrl(url)) {
      const xhr = this as XMLHttpRequest
      void packPromise.then((packJson) => {
        // Without a pack, fall through to the real request.
        if (!packJson) {
          originalSend.apply(xhr, args as never)
          return
        }
        // Serve our pack without touching the network.
        for (const [key, value] of [
          ['readyState', 4],
          ['status', 200],
          ['responseText', packJson],
          ['response', packJson],
        ] as const) {
          Object.defineProperty(xhr, key, { value, configurable: true })
        }
        xhr.dispatchEvent(new Event('readystatechange'))
        xhr.dispatchEvent(new Event('load'))
        xhr.dispatchEvent(new Event('loadend'))
      })
      return
    }

    return originalSend.apply(this, args as never)
  } as typeof XMLHttpRequest.prototype.send

  return true
}

function waitForTwikooReady() {
  return new Promise<void>((resolve, reject) => {
    let attempts = 0
    const maxAttempts = 80

    const check = () => {
      if (getTwikooApi()) {
        resolve()
        return
      }

      attempts += 1
      if (attempts >= maxAttempts) {
        reject(
          new Error('Twikoo script loaded but window.twikoo is unavailable')
        )
        return
      }

      window.setTimeout(check, 50)
    }

    check()
  })
}

export function loadTwikooScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (getTwikooApi()) {
    return Promise.resolve()
  }

  if (twikooLoadPromise) {
    return twikooLoadPromise
  }

  twikooLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      TWIKOO_SCRIPT_ID
    ) as HTMLScriptElement | null

    const handleReady = () => {
      void waitForTwikooReady().then(resolve).catch(reject)
    }

    const handleError = () => {
      twikooLoadPromise = null
      reject(new Error('Failed to load Twikoo script'))
    }

    if (existing) {
      if (getTwikooApi()) {
        resolve()
        return
      }

      if (existing.getAttribute('data-loaded') === 'true') {
        handleReady()
        return
      }

      existing.addEventListener('load', handleReady, { once: true })
      existing.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = TWIKOO_SCRIPT_SRC
    script.async = true
    script.id = TWIKOO_SCRIPT_ID
    script.crossOrigin = 'anonymous'
    script.addEventListener(
      'load',
      () => {
        script.setAttribute('data-loaded', 'true')
        handleReady()
      },
      { once: true }
    )
    script.addEventListener('error', handleError, { once: true })
    document.body.appendChild(script)
  })

  return twikooLoadPromise
}

export function preloadTwikooScript() {
  void loadTwikooScript().catch(() => {
    // Swallow preload failures and retry on actual mount.
  })
}

/** Default backend used when `VITE_TWIKOO_ENV_ID` is not configured. */
const TWIKOO_ENV_ID_FALLBACK = 'https://comments.markxu.icu/api/twikoo'

/** Resolved Twikoo env id (a CloudBase id or a self-hosted function URL). */
export function getTwikooEnvId(): string {
  return import.meta.env.VITE_TWIKOO_ENV_ID || TWIKOO_ENV_ID_FALLBACK
}

let backendWarmedFor: string | null = null

/**
 * Poke the (usually serverless) Twikoo backend once the page is idle.
 *
 * A cold Twikoo function takes ~1.5-2s to answer the first `GET_CONFIG`; warming
 * it while the reader is still up in the article means the real request lands on
 * a hot instance and the comment list appears almost immediately.
 */
export function warmTwikooBackend(envId: string) {
  if (typeof window === 'undefined') return
  if (!/^https?:\/\//i.test(envId)) return // CloudBase ids cannot be prefetched
  if (backendWarmedFor === envId) return
  backendWarmedFor = envId

  void fetch(envId, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
  }).catch(() => {
    // Warming is best-effort; a failure just means the first real call is cold.
  })
}
