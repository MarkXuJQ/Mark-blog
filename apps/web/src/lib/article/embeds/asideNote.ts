import type { ArticleEmbedDefinition } from './types'

const COLORS = new Set(['yellow', 'orange', 'blue'])
const WIDTHS = new Set(['small', 'medium', 'large', 'full'])

function resolveOption(
  source: Element,
  attribute: string,
  options: Set<string>,
  fallback: string
) {
  const value = source.getAttribute(attribute)?.trim().toLowerCase() ?? ''
  return options.has(value) ? value : fallback
}

export const asideNoteEmbed: ArticleEmbedDefinition = {
  name: 'AsideNote',
  selector: 'asidenote, aside-note',
  render({ document, source, context }) {
    if (!source.textContent?.trim()) return null

    const color = resolveOption(source, 'color', COLORS, 'yellow')
    const width = resolveOption(source, 'width', WIDTHS, 'full')
    const isZh = context.language?.toLowerCase().startsWith('zh')

    const aside = document.createElement('aside')
    aside.className = [
      'article-aside-note',
      `article-aside-note--${color}`,
      `article-aside-note--${width}`,
      'not-prose',
    ].join(' ')
    aside.dataset.articleEmbed = 'aside-note'
    aside.dataset.linkPreview = 'off'
    aside.setAttribute('aria-label', isZh ? '科普旁白' : 'Background note')

    const body = document.createElement('div')
    body.className = 'article-aside-note__body'
    while (source.firstChild) {
      body.append(source.firstChild)
    }

    aside.append(body)
    return aside
  },
}
