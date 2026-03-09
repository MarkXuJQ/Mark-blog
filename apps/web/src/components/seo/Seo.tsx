import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  DEFAULT_KEYWORDS,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from './shared'

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
  jsonLd?: JsonLd | JsonLd[]
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noindex = false,
  publishedTime,
  modifiedTime,
  jsonLd,
}: SeoProps) {
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const siteUrl = getSiteUrl()
  const siteName = t('siteTitle')
  const canonicalPath = url || location.pathname
  const canonicalUrl = toAbsoluteUrl(canonicalPath, siteUrl)
  const imageUrl = toAbsoluteUrl(image, siteUrl)
  const lang = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const locale = i18n.language?.startsWith('zh') ? 'zh_CN' : 'en_US'
  const alternateLocale = locale === 'zh_CN' ? 'en_US' : 'zh_CN'
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  // Logic:
  // 1. If title is provided and not empty, combine it with siteName.
  // 2. If title is missing, just use siteName.
  // Note: We removed the DEFAULT_TITLE check because siteName is now dynamic (i18n).
  const siteTitle = title ? `${title} | ${siteName}` : siteName

  const zhHref = (() => {
    try {
      const u = new URL(canonicalUrl)
      u.searchParams.set('lng', 'zh')
      return u.toString()
    } catch {
      return canonicalUrl
    }
  })()
  const enHref = (() => {
    try {
      const u = new URL(canonicalUrl)
      u.searchParams.set('lng', 'en')
      return u.toString()
    } catch {
      return canonicalUrl
    }
  })()
  const defaultSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Mark Xu',
      url: siteUrl,
      logo: toAbsoluteUrl('/images/logo.png', siteUrl),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      name: `${siteName} Logo`,
      contentUrl: toAbsoluteUrl('/images/logo.png', siteUrl),
    },
  ]
  const allSchemas = [...defaultSchemas, ...structuredData]

  return (
    <Helmet htmlAttributes={{ lang }} key={i18n.language}>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Mark Xu" />
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow'}
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={alternateLocale} />
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
      <link rel="alternate" hrefLang="zh-CN" href={zhHref} />
      <link rel="alternate" hrefLang="en-US" href={enHref} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Structured Data */}
      {allSchemas.map((schema, index) => (
        <script key={`ld-json-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
