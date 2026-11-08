import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import Avatar from 'boring-avatars'

/**
 * Comment avatars are generated locally from the commenter's mail hash with
 * boring-avatars, replacing the Robohash placeholder Twikoo would otherwise
 * point at.
 *
 * Only comments with **no** real avatar are replaced: before drawing anything
 * we ask the same Gravatar CDN Twikoo uses whether it actually has an image for
 * that hash (`d=404`) and keep the original picture when it does. The probe is
 * cached per hash, so a visitor with several comments costs one request.
 */

/** Palette tuned to the site: brand blues plus the coral/orange accents. */
const AVATAR_COLORS = ['#2e7ea3', '#4e98ba', '#ff5941', '#f9a03f', '#5ad2a8']

const AVATAR_VARIANT = 'beam'

const PROBE_TIMEOUT_MS = 15000
/** Fallback reveal delay: never leave an avatar hidden if the probe stalls. */
const PENDING_TIMEOUT_MS = 6000
/** Wait this long before re-probing a hash whose probe failed/timed out. */
const PROBE_RETRY_MS = 5000

type AvatarPresence = 'real' | 'none' | 'unknown'

/** Gravatar CDNs we know answer `d=404` with a real HTTP 404. */
const SUPPORTED_CDN_HOSTS =
  /(?:^|\.)(?:weavatar\.com|gravatar\.com|cravatar\.(?:cn|com)|geekzu\.org|libravatar\.org|gravatar\.loli\.net)$/i

const presenceCache = new Map<string, Promise<AvatarPresence>>()
/** Hashes whose probe failed/timed out; retried after {@link PROBE_RETRY_MS}. */
const presenceRetryAt = new Map<string, number>()
const svgCache = new Map<string, string>()
let injectionCounter = 0

/**
 * Render one avatar to SVG markup.
 *
 * boring-avatars only exposes a React component, so we mount it into a detached
 * container, flush synchronously, lift the markup out and unmount again. That
 * keeps Twikoo's DOM (which we do not own) free of extra React roots.
 */
function renderAvatarSvg(seed: string): string {
  const cached = svgCache.get(seed)
  if (cached) return cached

  const holder = document.createElement('div')
  const root = createRoot(holder)
  try {
    flushSync(() => {
      root.render(
        createElement(Avatar, {
          name: seed,
          variant: AVATAR_VARIANT,
          colors: AVATAR_COLORS,
          size: '100%',
          square: true,
        })
      )
    })
    const markup = holder.innerHTML
    svgCache.set(seed, markup)
    return markup
  } finally {
    root.unmount()
  }
}

/**
 * boring-avatars derives its mask and gradient ids from React's `useId`, so two
 * copies of one cached markup would collide. Re-key every id in the copy and
 * rewrite the matching `url(#...)` references.
 */
function createAvatarElement(seed: string): SVGElement | null {
  const holder = document.createElement('div')
  holder.innerHTML = renderAvatarSvg(seed)
  const svg = holder.firstElementChild
  if (!(svg instanceof SVGElement)) return null

  injectionCounter += 1
  const suffix = `ba${injectionCounter}`
  const renamed = new Map<string, string>()

  svg.querySelectorAll('[id]').forEach((node) => {
    const id = node.getAttribute('id')
    if (!id) return
    const next = `${id}-${suffix}`
    renamed.set(id, next)
    node.setAttribute('id', next)
  })

  if (renamed.size > 0) {
    for (const node of svg.querySelectorAll('*')) {
      for (const attribute of Array.from(node.attributes)) {
        const reference = attribute.value.match(/^url\(#(.+)\)$/)
        if (!reference) continue
        const next = renamed.get(reference[1])
        if (next) node.setAttribute(attribute.name, `url(#${next})`)
      }
    }
  }

  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
  return svg
}

function extractMailHash(src: string): { origin: string; hash: string } | null {
  let url: URL
  try {
    url = new URL(src, window.location.href)
  } catch {
    return null
  }
  if (!SUPPORTED_CDN_HOSTS.test(url.hostname)) return null
  const match = url.pathname.match(/\/([a-f0-9]{32}|[a-f0-9]{64})\/?$/i)
  if (!match) return null
  return { origin: url.origin, hash: match[1].toLowerCase() }
}

async function probeAvatarPresence(
  origin: string,
  hash: string
): Promise<AvatarPresence> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(`${origin}/avatar/${hash}?d=404&s=16`, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (response.status === 404) return 'none'
    if (response.ok) return 'real'
    return 'unknown'
  } catch {
    // Offline / blocked: keep whatever Twikoo rendered instead of guessing.
    return 'unknown'
  } finally {
    window.clearTimeout(timer)
  }
}

function getAvatarPresence(
  origin: string,
  hash: string
): Promise<AvatarPresence> {
  const key = `${origin}/avatar/${hash}`

  const stored = readPresenceCache(key)
  if (stored) return Promise.resolve(stored)

  const cached = presenceCache.get(key)
  if (cached) return cached

  const retryAt = presenceRetryAt.get(key)
  if (retryAt && Date.now() < retryAt) return Promise.resolve('unknown')

  const pending = probeAvatarPresence(origin, hash).then((presence) => {
    presenceCache.delete(key)
    if (presence === 'unknown') {
      // Offline, blocked or too slow right now: retry on a later render pass
      // instead of caching a miss that would keep the robot forever.
      presenceRetryAt.set(key, Date.now() + PROBE_RETRY_MS)
      return presence
    }
    presenceRetryAt.delete(key)
    writePresenceCache(key, presence)
    return presence
  })
  presenceCache.set(key, pending)
  return pending
}

const PRESENCE_CACHE_KEY = 'comment-avatar-presence:v1'
const PRESENCE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

type PresenceCacheEntry = Record<string, { presence: AvatarPresence; at: number }>

function readPresenceCacheStore(): PresenceCacheEntry {
  try {
    const raw = window.sessionStorage.getItem(PRESENCE_CACHE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? (parsed as PresenceCacheEntry)
      : {}
  } catch {
    return {}
  }
}

function readPresenceCache(key: string): AvatarPresence | null {
  const entry = readPresenceCacheStore()[key]
  if (!entry || Date.now() - entry.at > PRESENCE_CACHE_TTL_MS) return null
  return entry.presence
}

function writePresenceCache(key: string, presence: AvatarPresence) {
  try {
    const store = readPresenceCacheStore()
    store[key] = { presence, at: Date.now() }
    window.sessionStorage.setItem(PRESENCE_CACHE_KEY, JSON.stringify(store))
  } catch {
    // Storage can be full or disabled; probing again is a fine fallback.
  }
}

function revealAvatar(avatar: HTMLElement) {
  avatar.removeAttribute('data-avatar-state')
}

/**
 * Swap the placeholder avatar of every comment (and of the composer preview)
 * under `root` that has no real Gravatar.
 *
 * Safe to call repeatedly: Twikoo re-renders on refresh, sort and while the
 * visitor types their email, so the work is keyed on the mail hash currently in
 * the image instead of a one-shot flag.
 */
export async function decorateCommentAvatars(root: HTMLElement): Promise<void> {
  const images = Array.from(
    root.querySelectorAll<HTMLImageElement>(
      '.tk-comment .tk-avatar > img, .tk-submit .tk-avatar > img'
    )
  )

  await Promise.all(images.map((img) => decorateAvatar(img)))
}

async function decorateAvatar(img: HTMLImageElement): Promise<void> {
  const avatar = img.parentElement
  if (!avatar) return

  const previous = avatar.querySelector<SVGElement>('svg[data-boring-avatar]')

  /** Undo a previous swap, e.g. when the composer email changed. */
  const resetGenerated = () => {
    previous?.remove()
    delete img.dataset.boringAvatarHidden
  }

  const target = extractMailHash(img.getAttribute('src') ?? '')
  if (!target) {
    // QQ avatars and explicitly configured avatar URLs are real pictures.
    resetGenerated()
    return
  }

  if (previous?.dataset.boringAvatar === target.hash) {
    // Already showing the right generated avatar; make sure it is visible.
    img.dataset.boringAvatarHidden = 'true'
    return
  }
  resetGenerated()

  if (avatar.dataset.avatarState === 'pending') return

  // Claim the node synchronously so a re-render during the await cannot start a
  // second probe, and keep the placeholder hidden meanwhile.
  avatar.dataset.avatarState = 'pending'
  const revealTimer = window.setTimeout(
    () => revealAvatar(avatar),
    PENDING_TIMEOUT_MS
  )

  const presence = await getAvatarPresence(target.origin, target.hash)
  window.clearTimeout(revealTimer)

  if (!avatar.isConnected) return
  // The visitor may have typed a different email while the probe was running.
  if (!img.isConnected) return

  if (presence === 'none' && !avatar.querySelector('svg[data-boring-avatar]')) {
    const svg = createAvatarElement(target.hash)
    if (svg) {
      svg.dataset.boringAvatar = target.hash
      // Keep Vue's <img> in place (hidden) rather than removing it: Twikoo
      // re-renders these nodes and would otherwise patch a detached child.
      img.dataset.boringAvatarHidden = 'true'
      avatar.replaceChildren(img, svg)
    }
  }
  revealAvatar(avatar)
}
