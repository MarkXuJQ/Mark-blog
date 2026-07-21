import { referencePanelEmbed } from './referencePanel'
import type { ArticleEmbedContext, ArticleEmbedDefinition } from './types'
import { websiteCardEmbed } from './websiteCard'

export const ARTICLE_EMBEDS: readonly ArticleEmbedDefinition[] = [
  websiteCardEmbed,
  referencePanelEmbed,
]

function getReplacementTarget(source: Element) {
  const parent = source.parentElement
  if (parent?.tagName !== 'P') return source

  const hasOtherContent = Array.from(parent.childNodes).some(
    (node) => node !== source && node.textContent?.trim()
  )
  return hasOtherContent ? source : parent
}

export function decorateArticleEmbeds(
  html: string,
  context: ArticleEmbedContext = {}
) {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  ARTICLE_EMBEDS.forEach((embed) => {
    Array.from(document.querySelectorAll(embed.selector)).forEach((source) => {
      const target = getReplacementTarget(source)
      const rendered = embed.render({ document, source, context })
      if (rendered) {
        target.replaceWith(rendered)
      } else {
        target.remove()
      }
    })
  })

  return document.body.innerHTML
}
