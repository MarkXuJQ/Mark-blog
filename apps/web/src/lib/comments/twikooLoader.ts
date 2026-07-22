export interface TwikooApi {
  init: (options: {
    envId: string
    el: string
    path?: string
    onCommentLoaded?: () => void
  }) => void
  getCommentsCount: (options: {
    envId: string
    urls: string[]
    includeReply?: boolean
  }) => Promise<Array<{ url: string; count: number }>>
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
