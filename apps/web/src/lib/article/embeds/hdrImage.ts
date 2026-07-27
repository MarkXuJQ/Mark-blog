import { getOriginalImageUrl } from '@/lib/image'
import type { ArticleEmbedDefinition } from './types'

function getAttribute(element: Element, name: string) {
  return element.getAttribute(name)?.trim() ?? ''
}

export const hdrImageEmbed: ArticleEmbedDefinition = {
  name: 'HdrImage',
  selector: 'hdrimage, hdr-image',
  render({ document, source }) {
    const src = getAttribute(source, 'src')
    if (!src) return null

    const alt = getAttribute(source, 'alt')
    const originalSrc = getOriginalImageUrl(src)

    const figure = document.createElement('figure')
    figure.className = 'article-hdr-image not-prose'
    figure.dataset.articleEmbed = 'hdr-image'
    figure.dataset.linkPreview = 'off'

    const image = document.createElement('img')
    image.className = 'article-hdr-image__image hdr-image'
    image.src = originalSrc
    image.alt = alt
    image.dataset.originalSrc = originalSrc
    image.dataset.hdrImage = 'true'
    image.loading = 'lazy'
    image.decoding = 'async'
    image.referrerPolicy = 'no-referrer'
    figure.append(image)

    const caption = source.hasAttribute('caption')
      ? getAttribute(source, 'caption')
      : alt
    if (caption) {
      const figcaption = document.createElement('figcaption')
      figcaption.className = 'article-hdr-image__caption'
      figcaption.textContent = caption
      figure.append(figcaption)
    }

    return figure
  },
}
