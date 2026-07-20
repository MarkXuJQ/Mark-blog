import { referencePanelWidget } from './referencePanel'
import type { ArticleWidgetContext, ArticleWidgetDefinition } from './types'
import { websiteCardWidget } from './websiteCard'

export const ARTICLE_WIDGETS: readonly ArticleWidgetDefinition[] = [
  websiteCardWidget,
  referencePanelWidget,
]

function getReplacementTarget(source: Element) {
  const parent = source.parentElement
  if (parent?.tagName !== 'P') return source

  const hasOtherContent = Array.from(parent.childNodes).some(
    (node) => node !== source && node.textContent?.trim()
  )
  return hasOtherContent ? source : parent
}

export function decorateArticleWidgets(
  html: string,
  context: ArticleWidgetContext = {}
) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  ARTICLE_WIDGETS.forEach((widget) => {
    Array.from(document.querySelectorAll(widget.selector)).forEach((source) => {
      const target = getReplacementTarget(source)
      const rendered = widget.render({ document, source, context })
      if (rendered) {
        target.replaceWith(rendered)
      } else {
        target.remove()
      }
    })
  })

  return document.body.innerHTML
}
