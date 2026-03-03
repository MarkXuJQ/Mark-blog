export const DEFAULT_SITE_URL = 'https://markxu.icu'
export const DEFAULT_TITLE = 'Mark的自留地'
export const DEFAULT_DESCRIPTION = '这里是 Mark Xu 的个人博客，记录技术与生活。'
export const DEFAULT_KEYWORDS =
  'Mark Xu, 徐健乔, Xu Jianqiao, Blog, Technology, Life, Coding'
export const DEFAULT_IMAGE = '/images/logo.png'

export interface JsonLd {
  [key: string]: unknown
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export function getSiteUrl() {
  return import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL
}

export function toAbsoluteUrl(input: string, siteUrl = getSiteUrl()) {
  try {
    return new URL(input, siteUrl).toString()
  } catch {
    return new URL('/', siteUrl).toString()
  }
}

export function toIsoDateTime(input?: string) {
  if (!input) return undefined
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function extractFirstImageFromHtml(html: string) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1]
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
