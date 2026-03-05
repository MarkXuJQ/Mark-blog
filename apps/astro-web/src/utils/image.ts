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

export function rewriteHtmlImageSrc(html: string): string {
  if (typeof window === 'undefined') return html // Guard for SSR

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const imgs = doc.querySelectorAll('img')
  imgs.forEach((img, index) => {
    const src = img.getAttribute('src') || ''
    const resolved = getImageUrl(src)
    const isFirstContentImage = index === 0

    img.setAttribute('src', resolved)
    img.setAttribute('loading', isFirstContentImage ? 'eager' : 'lazy')
    img.setAttribute('fetchpriority', isFirstContentImage ? 'high' : 'auto')
    img.setAttribute('decoding', 'async')
    img.setAttribute('referrerpolicy', 'no-referrer')
  })
  return doc.body.innerHTML
}
