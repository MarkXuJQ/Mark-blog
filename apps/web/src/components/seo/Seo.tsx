import { Helmet } from 'react-helmet-async'

interface SeoProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
}

export function Seo({
  title = 'Mark Xu的小屋',
  description = '这里是 Mark Xu 的个人博客，记录技术与生活。',
  keywords = 'Mark Xu, Blog, Technology, Life, Coding',
  image = '/logo.png', // 默认分享图片
  url = typeof window !== 'undefined' ? window.location.href : '',
}: SeoProps) {
  const siteTitle = title === 'Mark Xu的小屋' ? title : `${title} | Mark Xu的小屋`

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={siteTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  )
}
