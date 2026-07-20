import type { ArticleWidgetDefinition } from './types'

function getAttribute(element: Element, name: string) {
  return element.getAttribute(name)?.trim() || ''
}

function parseWebsiteUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function buildTextElement(
  document: Document,
  tagName: string,
  className: string,
  text: string
) {
  const element = document.createElement(tagName)
  element.className = className
  element.textContent = text
  return element
}

export const websiteCardWidget: ArticleWidgetDefinition = {
  name: 'WebsiteCard',
  selector: 'websitecard, website-card',
  render({ document, source, context }) {
    const target = parseWebsiteUrl(getAttribute(source, 'url'))
    if (!target) return null

    const hostname = target.hostname.replace(/^www\./, '')
    const title = getAttribute(source, 'title') || hostname
    const description = getAttribute(source, 'description')
    const isZh = context.language?.toLowerCase().startsWith('zh')

    const card = document.createElement('a')
    card.className = 'article-website-card not-prose'
    card.href = target.href
    card.target = '_blank'
    card.rel = 'noopener noreferrer'
    card.setAttribute('data-article-widget', 'website-card')
    card.setAttribute('aria-label', `${title} · ${hostname}`)

    const media = document.createElement('span')
    media.className = 'article-website-card__media'

    const screenshot = document.createElement('img')
    screenshot.className = 'article-website-card__image no-zoom'
    screenshot.src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(
      target.href
    )}?w=400`
    screenshot.alt = isZh ? `${title} 的网站截图` : `Screenshot of ${title}`
    screenshot.width = 192
    screenshot.height = 128
    screenshot.loading = 'lazy'
    screenshot.decoding = 'async'
    media.append(screenshot)

    const body = document.createElement('span')
    body.className = 'article-website-card__body'

    const host = buildTextElement(
      document,
      'span',
      'article-website-card__host',
      hostname
    )
    const heading = document.createElement('span')
    heading.className = 'article-website-card__heading'
    heading.append(
      buildTextElement(document, 'span', 'article-website-card__title', title),
      buildTextElement(document, 'span', 'article-website-card__arrow', '↗')
    )
    heading.lastElementChild?.setAttribute('aria-hidden', 'true')

    body.append(host, heading)
    if (description) {
      body.append(
        buildTextElement(
          document,
          'span',
          'article-website-card__description',
          description
        )
      )
    }

    card.append(media, body)
    return card
  },
}
