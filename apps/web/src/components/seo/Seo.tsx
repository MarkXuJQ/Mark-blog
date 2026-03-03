import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

interface SeoProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  noindex?: boolean
  publishedTime?: string
  modifiedTime?: string
}

const DEFAULT_SITE_URL = 'https://markxu.icu'
const DEFAULT_TITLE = 'Mark Xu的小屋'
const DEFAULT_DESCRIPTION = '这里是 Mark Xu 的个人博客，记录技术与生活。'
const DEFAULT_KEYWORDS =
  'Mark Xu, 徐健乔, Xu Jianqiao, Blog, Technology, Life, Coding'
const DEFAULT_IMAGE = '/images/logo.png'

function toAbsoluteUrl(input: string, siteUrl: string) {
  try {
    return new URL(input, siteUrl).toString()
  } catch {
    return new URL('/', siteUrl).toString()
  }
}

export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noindex = false,
  publishedTime,
  modifiedTime,
}: SeoProps) {
  const location = useLocation()
  const { i18n } = useTranslation()
  const siteUrl = import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL
  const path = `${location.pathname}${location.search}`
  const canonicalUrl = toAbsoluteUrl(url || path, siteUrl)
  const imageUrl = toAbsoluteUrl(image, siteUrl)
  const lang = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en'
  const locale = i18n.language?.startsWith('zh') ? 'zh_CN' : 'en_US'
  const siteTitle =
    title === DEFAULT_TITLE ? title : `${title} | ${DEFAULT_TITLE}`

  return (
    <Helmet htmlAttributes={{ lang }}>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={DEFAULT_TITLE} />
      <meta property="og:locale" content={locale} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      {type === 'article' && publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {type === 'article' && modifiedTime ? (
        <meta property="article:modified_time" content={modifiedTime} />
      ) : null}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  )
}
