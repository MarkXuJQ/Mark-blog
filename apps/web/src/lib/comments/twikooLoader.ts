export interface TwikooApi {
  init: (options: {
    envId: string
    el: string
    path?: string
    /** Twikoo UI language, e.g. 'zh-cn' | 'en-us'. */
    lang?: string
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

const TWIKOO_SCRIPT_ID = 'twikoo-script'
const TWIKOO_SCRIPT_SRC =
  'https://registry.npmmirror.com/twikoo/1.7.0/files/dist/twikoo.min.js'

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

let packXhrPatched = false

/**
 * Deterministically swap Twikoo's emotion pack.
 *
 * Twikoo loads the pack with a raw XMLHttpRequest to `config.EMOTION_CDN` (or its
 * built-in default). Racing that by patching `config` and calling `initOwo()`
 * again is inherently flaky: Twikoo replaces the whole config object when its
 * asynchronous GET_CONFIG arrives, and mounted-order varies between loads.
 *
 * Instead we intercept the request at its source: any XHR for an OwO JSON gets
 * answered with our validated pack. That makes the result identical on every
 * load, regardless of config timing, and leaves the admin's own EMOTION_CDN
 * untouched (we only stand in when it is unset).
 */
export async function installEmotionPackInterceptor(
  emotionCdn: string
): Promise<boolean> {
  if (typeof window === 'undefined' || packXhrPatched) return false

  const pack = await loadEmotionPack(emotionCdn)
  // Without a valid pack the interceptor would only break the picker.
  if (!pack) return false

  packXhrPatched = true
  const packJson = JSON.stringify(pack)
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
    const isPackRequest =
      /(?:^|\/)(?:owo|emotions?)(?:[\w.-]*)\.json(?:\?|$)/i.test(url) ||
      /owo\.json/i.test(url)

    // Only answer for Twikoo's default pack. If the site configured its own
    // EMOTION_CDN, that URL is not the default one and is left alone.
    const isDefaultPack =
      /owo\.imaegoo\.com/i.test(url) || /\/emotions\/owo\.json/i.test(url)

    if (isPackRequest && isDefaultPack) {
      // Serve our pack without touching the network.
      const xhr = this as XMLHttpRequest
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
