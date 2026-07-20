import { rewriteHtmlImageSrc } from '@/utils/image'
import { decorateArticleLinkPreviews } from './decorateArticleLinkPreviews'
import { decorateArticleWidgets } from './widgets'

export function decorateArticleContent(html: string, language?: string) {
  const withImages = rewriteHtmlImageSrc(html)
  const withWidgets = decorateArticleWidgets(withImages, { language })
  return decorateArticleLinkPreviews(withWidgets, language)
}
