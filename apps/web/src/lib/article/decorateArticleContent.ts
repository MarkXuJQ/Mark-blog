import { rewriteHtmlImageSrc } from '@/lib/image'
import { decorateArticleLinkPreviews } from './decorateArticleLinkPreviews'
import { decorateArticleEmbeds } from './embeds'

export function decorateArticleContent(html: string, language?: string) {
  const withImages = rewriteHtmlImageSrc(html)
  const withEmbeds = decorateArticleEmbeds(withImages, { language })
  return decorateArticleLinkPreviews(withEmbeds, language)
}
