import type { BlogPost, MarkdownPost } from '../types'

// Use Vite's glob import to load all markdown files from the content directory
const markdownFiles = import.meta.glob<MarkdownPost>(
  '@content/posts/*.md',
  { eager: true },
)

export const getAllPosts = (): BlogPost[] => {
  return Object.entries(markdownFiles)
    .map(([path, module]) => {
      const slug = path.split('/').pop()?.replace('.md', '') || ''
      const { attributes, html } = module

      return {
        id: slug,
        slug,
        title: attributes.title,
        date: attributes.date,
        summary: attributes.summary,
        content: html,
        tags: attributes.tags,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return getAllPosts().find((post) => post.slug === slug)
}
