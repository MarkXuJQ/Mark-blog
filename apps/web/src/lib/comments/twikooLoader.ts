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
      const data: unknown = await res.json()
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
    } catch {
      return null
    }
  })()

  return emotionPackPromise
}

/**
 * Point Twikoo's OwO picker at a custom pack at runtime, without requiring the
 * deployment to set `EMOTION_CDN` in the Twikoo admin panel.
 *
 * Twikoo's composer component keeps `config` (the object fetched via GET_CONFIG)
 * and exposes `initOwo()`, which re-reads `config.EMOTION_CDN` and rebuilds the
 * picker. Vue mirrors each component instance onto its root element as
 * `__vue__`, so we can locate it from the DOM and re-run initOwo.
 *
 * An explicitly configured admin pack always wins, and nothing is applied when
 * the pack fails validation (leaving Twikoo's working default in place).
 */
export async function applyEmotionPack(emotionCdn: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  type TwikooVm = {
    config?: Record<string, string>
    initOwo?: () => void
    $twikoo?: { serverConfig?: Record<string, string> }
  }

  const mount = document.querySelector<HTMLElement>(
    '#twikoo-container, #twikoo'
  )
  if (!mount) return false

  const findVm = (): TwikooVm | null => {
    const candidates: HTMLElement[] = []
    const submitEl = mount.querySelector<HTMLElement>('.tk-submit')
    if (submitEl) candidates.push(submitEl)
    candidates.push(mount)
    const root = mount.querySelector<HTMLElement>('.twikoo')
    if (root) candidates.push(root)

    for (const el of candidates) {
      const vm = (el as unknown as { __vue__?: TwikooVm }).__vue__
      if (vm && typeof vm.initOwo === 'function') return vm
    }
    return null
  }

  const vm = findVm()
  if (!vm) return false

  const config = vm.config ?? vm.$twikoo?.serverConfig
  if (!config) return false

  // Wait until the server config has actually landed. Twikoo fetches it via an
  // async GET_CONFIG *after* first render and then replaces the whole config
  // object, which would silently discard anything we wrote beforehand.
  const serverReady =
    typeof vm.$twikoo?.serverConfig === 'object' &&
    Object.keys(vm.$twikoo.serverConfig ?? {}).length > 0
  if (!serverReady) return false

  // Respect a pack configured in the Twikoo admin panel.
  const existing = config.EMOTION_CDN
  if (existing && existing !== emotionCdn) return true

  const pack = await loadEmotionPack(emotionCdn)
  // Bail out instead of breaking the picker when the pack is unreachable.
  if (!pack) return false

  const expectedGroups = Object.keys(pack).length
  // Ground truth: how many groups the picker actually rendered. `config` alone
  // is unreliable because Twikoo swaps the whole object when GET_CONFIG lands.
  const renderedGroups = (): number =>
    mount.querySelectorAll('.OwO .OwO-packages li').length

  if (renderedGroups() === expectedGroups && existing === emotionCdn) {
    return true
  }

  config.EMOTION_CDN = emotionCdn
  if (vm.config) vm.config.EMOTION_CDN = emotionCdn
  if (vm.$twikoo?.serverConfig) {
    vm.$twikoo.serverConfig.EMOTION_CDN = emotionCdn
  }
  vm.initOwo?.()

  // initOwo fetches the pack asynchronously; give it a moment to land before
  // the caller decides whether another attempt is needed.
  for (let i = 0; i < 12; i += 1) {
    await new Promise((r) => setTimeout(r, 250))
    if (renderedGroups() === expectedGroups) {
      // Re-assert the URL: a late GET_CONFIG may have blanked it again.
      if (vm.config) vm.config.EMOTION_CDN = emotionCdn
      if (vm.$twikoo?.serverConfig) {
        vm.$twikoo.serverConfig.EMOTION_CDN = emotionCdn
      }
      return true
    }
  }

  return false
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
