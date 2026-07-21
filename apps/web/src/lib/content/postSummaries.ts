import rawPostSummaries from '../../data/post-summaries.json'
import type { BlogPostSummary } from '@/lib/content/posts'

type PostLanguage = 'zh' | 'en'
type LocalizedBlogPostSummary = BlogPostSummary & {
  language: PostLanguage
}

function resolveLanguage(language?: string): PostLanguage {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

type PostSummaryCache = Record<PostLanguage, BlogPostSummary[] | null>
const cachedPostSummaries: PostSummaryCache = { zh: null, en: null }
const postSummaries = rawPostSummaries as LocalizedBlogPostSummary[]

export function getAllPostSummaries(language?: string): BlogPostSummary[] {
  const normalizedLanguage = resolveLanguage(language)
  const cached = cachedPostSummaries[normalizedLanguage]
  if (cached) return cached

  const summaries = postSummaries
    .filter((post) => post.language === normalizedLanguage)
    .map((post) => {
      const { language, ...summary } = post
      void language
      return summary
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  cachedPostSummaries[normalizedLanguage] = summaries
  return summaries
}
