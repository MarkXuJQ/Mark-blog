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
  
  // Get base URL from environment variable
  const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL
  
  if (baseUrl) {
    // Remove trailing slash from base URL if present
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${normalizedBaseUrl}${normalizedPath}`
  }

  return normalizedPath
}
