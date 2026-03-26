import type { BlogPost, MarkdownPost } from '../types'

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

const resolveLanguage = (language?: string): PostLanguage => {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

const resolveFolderFromPath = (path: string): PostFolder | null => {
  if (path.includes('/posts/chinese/')) return 'chinese'
  if (path.includes('/posts/english/')) return 'english'
  return null
}

// Use Vite's glob import to load markdown files from language folders.
const markdownFiles = import.meta.glob<MarkdownPost>(
  ['@content/posts/chinese/*.md', '@content/posts/english/*.md'],
  { eager: true },
)

type PostsCache = Record<PostLanguage, BlogPost[] | null>
const __cachedPosts: PostsCache = { zh: null, en: null }
let __cachedAllPosts: BlogPost[] | null = null

const parsePost = (path: string, module: MarkdownPost): BlogPost | null => {
  const slug = path.split('/').pop()?.replace('.md', '') || ''
  if (!slug) return null

  const { attributes, html } = module

  return {
    id: slug,
    slug,
    title: attributes.title,
    date: attributes.date,
    updated: attributes.updated,
    summary: attributes.summary,
    content: html,
    tags: attributes.tags,
    category: attributes.category,
  }
}

export const getAllPosts = (language?: string): BlogPost[] => {
  const normalizedLanguage = resolveLanguage(language)
  const cached = __cachedPosts[normalizedLanguage]
  if (cached) return cached

  const folder = LANGUAGE_TO_FOLDER[normalizedLanguage]

  const posts = Object.entries(markdownFiles)
    .filter(([path]) => resolveFolderFromPath(path) === folder)
    .map(([path, module]) => parsePost(path, module))
    .filter((post): post is BlogPost => Boolean(post))
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

  __cachedPosts[normalizedLanguage] = posts
  return posts
}

const getAllPostsAcrossLanguages = (): BlogPost[] => {
  if (__cachedAllPosts) return __cachedAllPosts

  __cachedAllPosts = Object.entries(markdownFiles)
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
        // Prefer Chinese posts first for stable fallback behavior.
        return left.language === 'zh' ? -1 : 1
      }
      return left.post.slug.localeCompare(right.post.slug)
    })
    .map((item) => item.post)

  return __cachedAllPosts
}

export const getPostBySlug = (
  slug: string,
  language?: string
): BlogPost | undefined => {
  return (
    getAllPosts(language).find((post) => post.slug === slug) ||
    getAllPostsAcrossLanguages().find((post) => post.slug === slug)
  )
}

export const getAdjacentPosts = (
  slug: string,
  language?: string
): { prev?: BlogPost; next?: BlogPost } => {
  const languagePosts = getAllPosts(language)
  const index = languagePosts.findIndex((post) => post.slug === slug)

  if (index !== -1) {
    // posts are sorted by date desc
    // next (newer) is at index - 1
    // prev (older) is at index + 1
    const next = index > 0 ? languagePosts[index - 1] : undefined
    const prev =
      index < languagePosts.length - 1 ? languagePosts[index + 1] : undefined

    return { prev, next }
  }

  // Fallback to global list when the slug doesn't exist in the current language.
  const allPosts = getAllPostsAcrossLanguages()
  const allIndex = allPosts.findIndex((post) => post.slug === slug)
  if (allIndex === -1) return {}

  const next = allIndex > 0 ? allPosts[allIndex - 1] : undefined
  const prev = allIndex < allPosts.length - 1 ? allPosts[allIndex + 1] : undefined

  return { prev, next }
}
