import type { ArticleEmbedDefinition } from './types'
import {
  getWebsiteScreenshotUrl,
  resolveWebsiteCard,
} from '../websiteCardModel'

function getAttribute(element: Element, name: string) {
  return element.getAttribute(name)?.trim() || ''
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

export const websiteCardEmbed: ArticleEmbedDefinition = {
  name: 'WebsiteCard',
  selector: 'websitecard, website-card',
  render({ document, source, context }) {
    const model = resolveWebsiteCard({
      url: getAttribute(source, 'url'),
      title: getAttribute(source, 'title'),
      description: getAttribute(source, 'description'),
    })
    if (!model) return null

    const { description, hostname, title, url } = model
    const isZh = context.language?.toLowerCase().startsWith('zh')

    const card = document.createElement('a')
    card.className = 'article-website-card not-prose'
    card.href = url
    card.target = '_blank'
    card.rel = 'noopener noreferrer'
    card.setAttribute('data-article-embed', 'website-card')
    card.setAttribute('aria-label', `${title} · ${hostname}`)

    const media = document.createElement('span')
    media.className = 'article-website-card__media'

    const screenshot = document.createElement('img')
    screenshot.className = 'article-website-card__image no-zoom'
    screenshot.src = getWebsiteScreenshotUrl(url, 400)
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
