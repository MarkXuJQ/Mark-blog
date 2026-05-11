import type { BlogPost, MarkdownPost } from '@/types'

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
  { eager: true },
)

type PostsCache = Record<PostLanguage, BlogPost[] | null>
const cachedPosts: PostsCache = { zh: null, en: null }
let cachedAllPosts: BlogPost[] | null = null

function parsePost(path: string, module: MarkdownPost): BlogPost | null {
  const fileSlug = path.split('/').pop()?.replace('.md', '') || ''
  const frontmatterSlug = module.attributes.slug?.trim()
  const slug = frontmatterSlug || fileSlug
  if (!slug) return null

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
    aliases: aliases.size > 0 ? Array.from(aliases) : undefined,
    title: attributes.title,
    date: attributes.date,
    updated: attributes.updated,
    summary: attributes.summary,
    image: typeof attributes.image === 'string' ? attributes.image : undefined,
    content: html,
    tags: attributes.tags,
    category: attributes.category,
  }
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

function getAllPostsAcrossLanguages(): BlogPost[] {
  if (cachedAllPosts) return cachedAllPosts

  cachedAllPosts = Object.entries(markdownFiles)
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
    .map((item) => item.post)

  return cachedAllPosts
}

export function getPostBySlug(
  slug: string,
  language?: string,
  options?: { fallback?: boolean }
): BlogPost | undefined {
  const fallbackEnabled = options?.fallback !== false
  const exactMatch = getAllPosts(language).find(
    (post) => post.slug === slug || post.aliases?.includes(slug)
  )
  if (exactMatch || !fallbackEnabled) return exactMatch
  return getAllPostsAcrossLanguages().find(
    (post) => post.slug === slug || post.aliases?.includes(slug)
  )
}

export function getAdjacentPosts(
  slug: string,
  language?: string,
  options?: { fallback?: boolean }
): { prev?: BlogPost; next?: BlogPost } {
  const fallbackEnabled = options?.fallback !== false
  const languagePosts = getAllPosts(language)
  const index = languagePosts.findIndex(
    (post) => post.slug === slug || post.aliases?.includes(slug)
  )

  if (index !== -1) {
    const next = index > 0 ? languagePosts[index - 1] : undefined
    const prev =
      index < languagePosts.length - 1 ? languagePosts[index + 1] : undefined

    return { prev, next }
  }

  if (!fallbackEnabled) return {}

  const allPosts = getAllPostsAcrossLanguages()
  const allIndex = allPosts.findIndex(
    (post) => post.slug === slug || post.aliases?.includes(slug)
  )
  if (allIndex === -1) return {}

  const next = allIndex > 0 ? allPosts[allIndex - 1] : undefined
  const prev =
    allIndex < allPosts.length - 1 ? allPosts[allIndex + 1] : undefined

  return { prev, next }
}
