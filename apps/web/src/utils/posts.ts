import type { BlogPost, MarkdownPost } from '../types'

// Use Vite's glob import to load all markdown files from the content directory
const markdownFiles = import.meta.glob<MarkdownPost>(
  '@content/posts/*.md',
  { eager: true },
)

let __cachedPosts: BlogPost[] | null = null

export const getAllPosts = (): BlogPost[] => {
  if (__cachedPosts) return __cachedPosts

  __cachedPosts = Object.entries(markdownFiles)
    .map(([path, module]) => {
      const slug = path.split('/').pop()?.replace('.md', '') || ''
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
    })
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

  return __cachedPosts
}

export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return getAllPosts().find((post) => post.slug === slug)
}

export const getAdjacentPosts = (
  slug: string
): { prev?: BlogPost; next?: BlogPost } => {
  const posts = getAllPosts()
  const index = posts.findIndex((post) => post.slug === slug)

  if (index === -1) {
    return {}
  }

  // posts are sorted by date desc
  // next (newer) is at index - 1
  // prev (older) is at index + 1
  const next = index > 0 ? posts[index - 1] : undefined
  const prev = index < posts.length - 1 ? posts[index + 1] : undefined

  return { prev, next }
}
