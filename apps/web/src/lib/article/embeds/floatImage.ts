import type { ArticleEmbedDefinition } from './types'
import { getOptimizedImageUrl, getOriginalImageUrl } from '@/lib/image'

const DEFAULT_WIDTH_PERCENT = 40
const MIN_WIDTH_PERCENT = 30
const MAX_WIDTH_PERCENT = 50
const WIDTH_PRESETS: Record<string, number> = {
  small: 32,
  medium: DEFAULT_WIDTH_PERCENT,
  large: 48,
}

function getAttribute(element: Element, name: string) {
  return element.getAttribute(name)?.trim() ?? ''
}

function resolveWidthPercent(value: string) {
  const preset = WIDTH_PRESETS[value.toLowerCase()]
  if (preset) return preset

  const match = value.match(/^(\d+(?:\.\d+)?)%$/)
  if (!match) return DEFAULT_WIDTH_PERCENT

  const width = Number.parseFloat(match[1])
  if (!Number.isFinite(width)) return DEFAULT_WIDTH_PERCENT

  return Math.min(MAX_WIDTH_PERCENT, Math.max(MIN_WIDTH_PERCENT, width))
}

export const floatImageEmbed: ArticleEmbedDefinition = {
  name: 'FloatImage',
  selector: 'floatimage, float-image',
  render({ document, source }) {
    const src = getAttribute(source, 'src')
    if (!src) return null

    const alt = getAttribute(source, 'alt')
    const side =
      getAttribute(source, 'side').toLowerCase() === 'left' ? 'left' : 'right'
    const width = resolveWidthPercent(getAttribute(source, 'width'))
    const originalSrc = getOriginalImageUrl(src)

    const figure = document.createElement('figure')
    figure.className = `article-float-image article-float-image--${side} not-prose`
    figure.dataset.articleEmbed = 'float-image'
    figure.dataset.linkPreview = 'off'
    figure.style.setProperty('--article-float-image-width', `${width}%`)

    const image = document.createElement('img')
    image.className = 'article-float-image__image'
    image.src = getOptimizedImageUrl(originalSrc, 'content')
    image.alt = alt
    image.dataset.originalSrc = originalSrc
    image.loading = 'lazy'
    image.decoding = 'async'
    image.referrerPolicy = 'no-referrer'
    figure.append(image)

    const caption = source.hasAttribute('caption')
      ? getAttribute(source, 'caption')
      : alt
    if (caption) {
      const figcaption = document.createElement('figcaption')
      figcaption.className = 'article-float-image__caption'
      figcaption.textContent = caption
      figure.append(figcaption)
    }

    return figure
  },
}
