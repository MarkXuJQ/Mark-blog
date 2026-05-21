/**
 * Utility to resolve image URLs.
 * If VITE_IMAGE_BASE_URL is set, it will prepend it to the path.
 * Otherwise, it will fallback to the local public path.
 *
 * @param path - The image path (e.g., "/images/foo.jpg" or "images/foo.jpg")
 * @returns The full URL to the image
 */
export function getImageUrl(path: string): string {
  // If it's already a full URL, return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // Ensure path starts with / if it doesn't
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // We no longer automatically prepend VITE_IMAGE_BASE_URL
  // as per user request to use full URLs or relative paths manually.

  return normalizedPath
}

export type ImageTransformVariant =
  | 'content'
  | 'cover'
  | 'card'
  | 'thumbnail'
  | 'preview'

const DEFAULT_TRANSFORMABLE_HOSTS = ['img.markxu.icu', 'imgs.markxu.icu']

const TRANSFORMATION_OPTIONS: Record<ImageTransformVariant, string> = {
  content: 'width=1200,quality=76,format=auto,fit=scale-down,onerror=redirect',
  cover: 'width=1200,quality=76,format=auto,fit=scale-down,onerror=redirect',
  card: 'width=720,quality=72,format=auto,fit=scale-down,onerror=redirect',
  thumbnail: 'width=420,quality=68,format=auto,fit=scale-down,onerror=redirect',
  preview: 'width=1280,quality=76,format=auto,fit=scale-down,onerror=redirect',
}

function getTransformableHosts(): string[] {
  const configuredHosts = import.meta.env.VITE_CF_IMAGE_TRANSFORM_HOSTS
  if (!configuredHosts) return DEFAULT_TRANSFORMABLE_HOSTS

  return configuredHosts
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

function isTransformableCloudflareImage(src: string): boolean {
  if (!/^https?:\/\//i.test(src)) return false

  try {
    const url = new URL(src)
    const host = url.hostname.toLowerCase()
    const extension = url.pathname.split('.').pop()?.toLowerCase() ?? ''

    if (!getTransformableHosts().includes(host)) return false
    if (url.pathname.includes('/cdn-cgi/image/')) return false

    // Keep animated GIFs and SVGs untouched; they are usually better served as-is.
    return ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(extension)
  } catch {
    return false
  }
}

function buildCloudflareTransformationUrl(
  originalUrl: string,
  variant: ImageTransformVariant
): string {
  const url = new URL(originalUrl)
  const options = TRANSFORMATION_OPTIONS[variant]

  return `${url.origin}/cdn-cgi/image/${options}${url.pathname}${url.search}`
}

export function getOptimizedImageUrl(
  path: string,
  variant: ImageTransformVariant = 'content'
): string {
  const originalUrl = getImageUrl(path)
  if (import.meta.env.VITE_CF_IMAGE_TRANSFORMATIONS_ENABLED === 'false') {
    return originalUrl
  }

  if (!isTransformableCloudflareImage(originalUrl)) return originalUrl

  return buildCloudflareTransformationUrl(originalUrl, variant)
}

export function rewriteHtmlImageSrc(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const imgs = doc.querySelectorAll('img')
  imgs.forEach((img, index) => {
    const src = img.getAttribute('src') || ''
    const original = getImageUrl(src)
    const optimized = getOptimizedImageUrl(original, 'content')
    const isFirstContentImage = index === 0

    img.setAttribute('src', optimized)
    img.setAttribute('data-original-src', original)
    img.setAttribute('loading', isFirstContentImage ? 'eager' : 'lazy')
    img.setAttribute('fetchpriority', isFirstContentImage ? 'high' : 'auto')
    img.setAttribute('decoding', 'async')
    img.setAttribute('referrerpolicy', 'no-referrer')
  })
  return doc.body.innerHTML
}
