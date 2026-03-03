import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
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
  title = DEFAULT_TITLE,
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
  const { i18n } = useTranslation()
  const siteUrl = getSiteUrl()
  const path = `${location.pathname}${location.search}`
  const canonicalUrl = toAbsoluteUrl(url || path, siteUrl)
  const imageUrl = toAbsoluteUrl(image, siteUrl)
  const lang = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en'
  const locale = i18n.language?.startsWith('zh') ? 'zh_CN' : 'en_US'
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []
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

      {/* Structured Data */}
      {structuredData.map((schema, index) => (
        <script key={`ld-json-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
