import { rewriteHtmlImageSrc } from '@/lib/image'
import { decorateArticleLinkFavicons } from './decorateArticleLinkFavicons'
import { decorateArticleLinkPreviews } from './decorateArticleLinkPreviews'
import { decorateArticleEmbeds } from './embeds'

export function decorateArticleContent(html: string, language?: string) {
  const withImages = rewriteHtmlImageSrc(html)
  const withEmbeds = decorateArticleEmbeds(withImages, { language })
  const withPreviews = decorateArticleLinkPreviews(withEmbeds, language)
  return decorateArticleLinkFavicons(withPreviews)
}
