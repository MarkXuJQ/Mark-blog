import { getSiteUrl } from '@/lib/seo'

function isSkippableHref(href: string) {
  return (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:') ||
    href.startsWith('data:')
  )
}

function getFaviconUrl(rawHref: string, siteOrigin: string) {
  let target: URL
  try {
    target = new URL(rawHref, siteOrigin)
  } catch {
    return null
  }

  if (!/^https?:$/.test(target.protocol)) {
    return null
  }

  if (target.origin === siteOrigin) {
    return `${siteOrigin}/favicon-32.png`
  }

  // favicon.im serves a neutral placeholder for unknown domains, so a dead
  // external site never leaves a broken image inside the article.
  return `https://favicon.im/${encodeURIComponent(target.hostname)}?larger=true`
}

/**
 * Marks ordinary article links with a favicon URL consumed by a CSS
 * `::before` pseudo-element. A pseudo-element (rather than a real <img>)
 * keeps `GlobalLinkPreview`'s anchor checks intact and leaves link text
 * untouched for embeds/TOC extraction.
 */
export function decorateArticleLinkFavicons(html: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')
  const siteOrigin = new URL(getSiteUrl()).origin

  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const rawHref = anchor.getAttribute('href')?.trim()
    if (!rawHref || isSkippableHref(rawHref)) {
      return
    }

    // Image/media links and rich embeds already carry their own visuals.
    if (anchor.querySelector('img, picture, video, canvas, svg')) {
      return
    }
    if (
      anchor.closest(
        '.article-website-card, .article-reference-panel, .article-aside-note__body'
      ) ||
      anchor.closest('[data-link-preview-content="true"], [data-link-preview="off"]') ||
      anchor.dataset.linkPreview === 'off'
    ) {
      return
    }

    const faviconUrl = getFaviconUrl(rawHref, siteOrigin)
    if (!faviconUrl) {
      return
    }

    anchor.setAttribute('data-link-favicon', 'true')
    anchor.style.setProperty('--link-favicon-url', `url("${faviconUrl}")`)
  })

  return document.body.innerHTML
}
