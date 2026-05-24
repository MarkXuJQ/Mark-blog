import type { BlogPost, MarkdownPost } from '@/types'
import { getAllPostSummaries } from './postSummaries'

type PostLanguage = 'zh' | 'en'
type PostFolder = 'chinese' | 'english'

const LANGUAGE_TO_FOLDER: Record<PostLanguage, PostFolder> = {
  zh: 'chinese',
  en: 'english',
}

const FOLDER_TO_LANGUAGE: Record<PostFolder, PostLanguage> = {
  chinese: 'zh',
  english: 'en',
}

function resolveLanguage(language?: string): PostLanguage {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function resolveFolderFromPath(path: string): PostFolder | null {
  if (path.includes('/posts/chinese/')) return 'chinese'
  if (path.includes('/posts/english/')) return 'english'
  return null
}

const markdownFiles = import.meta.glob<MarkdownPost>(
  ['@content/posts/chinese/*.md', '@content/posts/english/*.md'],
  { eager: true }
)

type PostsCache = Record<PostLanguage, BlogPost[] | null>
const cachedPosts: PostsCache = { zh: null, en: null }
let cachedAllPostMatches: Array<{
  post: BlogPost
  language: PostLanguage
}> | null = null

function parsePost(path: string, module: MarkdownPost): BlogPost | null {
  const fileSlug = path.split('/').pop()?.replace('.md', '') || ''
  const frontmatterSlug = module.attributes.slug?.trim()
  const slug = frontmatterSlug || fileSlug
  if (!slug) return null
  const folder = resolveFolderFromPath(path)

  const { attributes, html } = module
  const aliases = new Set<string>()
  if (fileSlug !== slug) aliases.add(fileSlug)
  attributes.aliases?.forEach((alias) => {
    const normalizedAlias = alias.trim()
    if (normalizedAlias && normalizedAlias !== slug) {
      aliases.add(normalizedAlias)
    }
  })

  return {
    id: slug,
    slug,
    sourceSlug: fileSlug,
    aliases: aliases.size > 0 ? Array.from(aliases) : undefined,
    title: attributes.title,
    date: attributes.date,
    updated: attributes.updated,
    summary: attributes.summary,
    image: typeof attributes.image === 'string' ? attributes.image : undefined,
    content: html,
    tags: attributes.tags,
    category: attributes.category,
    wordCount: getWordCountForSlug(
      slug,
      folder ? FOLDER_TO_LANGUAGE[folder] : undefined
    ),
  }
}

function getWordCountForSlug(slug: string, language?: PostLanguage) {
  return getAllPostSummaries(language).find((post) => post.slug === slug)
    ?.wordCount
}

export function getAllPosts(language?: string): BlogPost[] {
  const normalizedLanguage = resolveLanguage(language)
  const cached = cachedPosts[normalizedLanguage]
  if (cached) return cached

  const folder = LANGUAGE_TO_FOLDER[normalizedLanguage]

  const posts = Object.entries(markdownFiles)
    .filter(([path]) => resolveFolderFromPath(path) === folder)
    .map(([path, module]) => parsePost(path, module))
    .filter((post): post is BlogPost => Boolean(post))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  cachedPosts[normalizedLanguage] = posts
  return posts
}

function getAllPostMatchesAcrossLanguages(): Array<{
  post: BlogPost
  language: PostLanguage
}> {
  if (cachedAllPostMatches) return cachedAllPostMatches

  cachedAllPostMatches = Object.entries(markdownFiles)
    .map(([path, module]) => {
      const post = parsePost(path, module)
      if (!post) return null
      const folder = resolveFolderFromPath(path)
      if (!folder) return null
      return { post, language: FOLDER_TO_LANGUAGE[folder] }
    })
    .filter((item): item is { post: BlogPost; language: PostLanguage } =>
      Boolean(item)
    )
    .sort((left, right) => {
      const dateDiff =
        new Date(right.post.date).getTime() - new Date(left.post.date).getTime()
      if (dateDiff !== 0) return dateDiff
      if (left.post.slug === right.post.slug) {
        return left.language === 'zh' ? -1 : 1
      }
      return left.post.slug.localeCompare(right.post.slug)
    })

  return cachedAllPostMatches
}

function findPostMatch(
  slug: string,
  language?: string,
  options?: { fallback?: boolean }
): { post: BlogPost; language: PostLanguage } | undefined {
  const normalizedLanguage = resolveLanguage(language)
  const fallbackEnabled = options?.fallback !== false
  const languagePosts = getAllPosts(normalizedLanguage)

  const exactLanguageMatch = languagePosts.find((post) => post.slug === slug)
  if (exactLanguageMatch) {
    return { post: exactLanguageMatch, language: normalizedLanguage }
  }

  if (fallbackEnabled) {
    const exactFallbackMatch = getAllPostMatchesAcrossLanguages().find(
      (item) => item.post.slug === slug
    )
    if (exactFallbackMatch) return exactFallbackMatch
  }

  const aliasLanguageMatch = languagePosts.find((post) =>
    post.aliases?.includes(slug)
  )
  if (aliasLanguageMatch) {
    return { post: aliasLanguageMatch, language: normalizedLanguage }
  }

  if (!fallbackEnabled) return undefined

  return getAllPostMatchesAcrossLanguages().find((item) =>
    item.post.aliases?.includes(slug)
  )
}

export function getPostBySlug(
  slug: string,
  language?: string,
  options?: { fallback?: boolean }
): BlogPost | undefined {
  return findPostMatch(slug, language, options)?.post
}

export function getAdjacentPosts(
  slug: string,
  language?: string,
  options?: { fallback?: boolean }
): { prev?: BlogPost; next?: BlogPost } {
  const match = findPostMatch(slug, language, options)
  if (!match) return {}

  const languagePosts = getAllPosts(match.language)
  const index = languagePosts.findIndex((post) => post.slug === match.post.slug)

  if (index !== -1) {
    const next = index > 0 ? languagePosts[index - 1] : undefined
    const prev =
      index < languagePosts.length - 1 ? languagePosts[index + 1] : undefined

    return { prev, next }
  }
  return {}
}

export function getSharedPostCommentPath(post: BlogPost): string {
  const pairedChinesePost = findPairedChinesePost(post)
  return toBlogPath(getCanonicalCommentSlug(post, pairedChinesePost))
}

function findPairedChinesePost(post: BlogPost): BlogPost | undefined {
  return getAllPosts('zh').find((candidate) => {
    if (
      candidate.slug === post.slug ||
      candidate.aliases?.includes(post.slug)
    ) {
      return true
    }
    if (post.aliases?.includes(candidate.slug)) {
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
}

function getCanonicalCommentSlug(
  post: BlogPost,
  pairedChinesePost?: BlogPost
): string {
  const languageNeutralSlug = stripLanguageSuffix(post.slug)
  if (languageNeutralSlug !== post.slug) return languageNeutralSlug

  const pairedLanguageNeutralSlug = pairedChinesePost
    ? stripLanguageSuffix(pairedChinesePost.slug)
    : undefined
  if (
    pairedLanguageNeutralSlug &&
    pairedLanguageNeutralSlug !== pairedChinesePost?.slug
  ) {
    return pairedLanguageNeutralSlug
  }

  return pairedChinesePost?.aliases?.[0] || post.aliases?.[0] || post.slug
}

function stripLanguageSuffix(slug: string): string {
  return slug.replace(/-(cn|en)$/i, '')
}

function toBlogPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`
}
