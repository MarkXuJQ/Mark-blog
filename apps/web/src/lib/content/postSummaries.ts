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
  summaries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  cachedPostSummaries[normalizedLanguage] = summaries
  return summaries
}

export function getPostSummaryMatch(
  slug: string,
  language?: string
): { summary: BlogPostSummary; language: PostLanguage } | undefined {
  const normalizedLanguage = resolveLanguage(language)
  const languageSummaries = getAllPostSummaries(normalizedLanguage)
  const exact = languageSummaries.find(
    (post) => post.slug === slug || post.aliases?.includes(slug)
  )
  if (exact) return { summary: exact, language: normalizedLanguage }

  const fallbackLanguage: PostLanguage = normalizedLanguage === 'zh' ? 'en' : 'zh'
  const fallback = getAllPostSummaries(fallbackLanguage).find(
    (post) => post.slug === slug || post.aliases?.includes(slug)
  )
  return fallback ? { summary: fallback, language: fallbackLanguage } : undefined
}

export function getAdjacentPostSummaries(
  slug: string,
  language?: string
): { prev?: BlogPostSummary; next?: BlogPostSummary } {
  const match = getPostSummaryMatch(slug, language)
  if (!match) return {}

  const posts = getAllPostSummaries(match.language)
  const index = posts.findIndex((post) => post.slug === match.summary.slug)
  if (index === -1) return {}

  return {
    next: index > 0 ? posts[index - 1] : undefined,
    prev: index < posts.length - 1 ? posts[index + 1] : undefined,
  }
}

export function getPostDetailPath(post: BlogPostSummary): string {
  return post.movieSubjectId
    ? '/movies/reviews/' + encodeURIComponent(post.slug)
    : '/blog/' + encodeURIComponent(post.slug)
}

export function getSharedPostCommentPath(post: BlogPostSummary): string {
  const pairedChinesePost = getAllPostSummaries('zh').find((candidate) => {
    if (
      candidate.slug === post.slug ||
      candidate.aliases?.includes(post.slug) ||
      post.aliases?.includes(candidate.slug)
    ) {
      return true
    }
    if (
      post.image &&
      candidate.image === post.image &&
      candidate.date === post.date
    ) {
      return true
    }
    return candidate.date === post.date && candidate.category === post.category
  })

  const neutralSlug = post.slug.replace(/-(cn|en)$/i, '')
  if (neutralSlug !== post.slug) return '/blog/' + encodeURIComponent(neutralSlug)

  const pairedNeutralSlug = pairedChinesePost?.slug.replace(/-(cn|en)$/i, '')
  const canonicalSlug =
    pairedNeutralSlug && pairedNeutralSlug !== pairedChinesePost?.slug
      ? pairedNeutralSlug
      : pairedChinesePost?.aliases?.[0] || post.aliases?.[0] || post.slug

  return '/blog/' + encodeURIComponent(canonicalSlug)
}
