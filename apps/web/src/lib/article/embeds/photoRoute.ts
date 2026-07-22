import type { ArticleEmbedDefinition } from './types'
import {
  formatPhotoRouteCaption,
  getPhotoRouteSummary,
} from '@/lib/content/photoRouteSummaries'

const ROUTE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i

function textElement(
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

export const photoRouteEmbed: ArticleEmbedDefinition = {
  name: 'PhotoRoute',
  selector: 'photoroute, photo-route',
  render({ document, source, context }) {
    const routeKey = source.getAttribute('route')?.trim() ?? ''
    if (!ROUTE_KEY_PATTERN.test(routeKey)) return null

    const isZh = context.language?.toLowerCase().startsWith('zh')
    const routeSummary = getPhotoRouteSummary(routeKey)
    const titleOverride = source.getAttribute('title')?.trim() ?? ''
    const description = source.getAttribute('desc')?.trim() ||
      (isZh
        ? '查看这段旅程的路径与停留点。'
        : 'Explore the route and stops from this journey.')
    const title = titleOverride || routeSummary?.title ||
      (isZh ? '旅行路线' : 'Travel route')
    const figure = document.createElement('figure')
    figure.className = 'article-photo-route not-prose'
    figure.dataset.articleEmbed = 'photo-route'
    figure.dataset.articlePhotoRoute = routeKey
    figure.dataset.photoRouteLanguage = isZh ? 'zh' : 'en'
    figure.dataset.photoRouteStatus = 'pending'
    figure.dataset.linkPreview = 'off'
    if (titleOverride) figure.dataset.photoRouteTitleOverride = 'true'
    figure.setAttribute('aria-label', title)

    const map = document.createElement('div')
    map.className = 'article-photo-route__map'
    map.dataset.photoRouteMap = ''
    map.append(
      textElement(
        document,
        'span',
        'article-photo-route__loading',
        isZh ? '正在加载路线地图' : 'Loading route map'
      )
    )

    const caption = document.createElement('figcaption')
    caption.className = 'article-photo-route__caption'
    const summary = document.createElement('span')
    summary.className = 'article-photo-route__summary'
    summary.append(
      textElement(document, 'span', 'article-photo-route__title', title),
      textElement(
        document,
        'span',
        'article-photo-route__description',
        description
      ),
      textElement(
        document,
        'span',
        'article-photo-route__meta',
        routeSummary
          ? formatPhotoRouteCaption(routeSummary, isZh ? 'zh' : 'en')
          : (isZh ? '路线信息不可用' : 'Route details unavailable')
      )
    )
    const button = document.createElement('button')
    button.className = 'article-photo-route__play'
    button.type = 'button'
    button.disabled = true
    button.textContent = isZh ? '播放路线' : 'Play route'
    caption.append(summary, button)
    figure.append(map, caption)
    return figure
  },
}
