import { getSiteUrl } from '../components/seo/shared'
import { getMovieReviewBySlug } from './movieReviews'
import { getImageUrl } from './image'
import { getPostBySlug } from './posts'

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

function isSkippableHref(href: string) {
  return (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:')
  )
}

export function decorateArticleLinkPreviews(html: string, language?: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const anchors = Array.from(document.querySelectorAll('a[href]'))
  const baseUrl = getSiteUrl()
  const siteOrigin = new URL(baseUrl).origin
  const isZh = language?.toLowerCase().startsWith('zh')

  anchors.forEach((anchor) => {
    const rawHref = anchor.getAttribute('href')?.trim()
    if (!rawHref || isSkippableHref(rawHref)) {
      return
    }

    let target: URL
    try {
      target = new URL(rawHref, baseUrl)
    } catch {
      return
    }

    if (target.origin !== siteOrigin) {
      return
    }

    const pathname = normalizePathname(target.pathname)

    if (pathname.startsWith('/blog/')) {
      const slug = decodeURIComponent(pathname.slice('/blog/'.length))
      if (!slug) {
        return
      }

      const post = getPostBySlug(slug, language)
      if (!post) {
        return
      }

      anchor.setAttribute('data-link-preview-kind', 'blog')
      anchor.setAttribute(
        'data-link-preview-badge',
        isZh ? '博客文章' : 'Blog article'
      )
      anchor.setAttribute('data-link-preview-title', post.title)
      anchor.setAttribute('data-link-preview-description', post.summary || '')
      anchor.setAttribute('data-link-preview-url-label', post.date)

      if (post.image) {
        anchor.setAttribute(
          'data-link-preview-image',
          getImageUrl(post.image)
        )
      }

      return
    }

    if (pathname.startsWith('/movies/reviews/')) {
      const slug = decodeURIComponent(pathname.slice('/movies/reviews/'.length))
      if (!slug) {
        return
      }

      const review = getMovieReviewBySlug(slug)
      if (!review) {
        return
      }

      anchor.setAttribute('data-link-preview-kind', 'movie-review')
      anchor.setAttribute(
        'data-link-preview-badge',
        isZh ? '电影短评' : 'Movie review'
      )
      anchor.setAttribute('data-link-preview-title', review.title)
      anchor.setAttribute(
        'data-link-preview-description',
        review.summary || review.movieTitle || ''
      )
      anchor.setAttribute('data-link-preview-url-label', review.date)
    }
  })

  return document.body.innerHTML
}
