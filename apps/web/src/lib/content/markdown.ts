export interface MarkdownPostAttributes {
  title: string
  date: string
  updated?: string
  summary: string
  slug?: string
  aliases?: string[]
  image?: string
  tags?: string[]
  category?: string
  [key: string]: unknown
}

export interface MarkdownPost {
  attributes: MarkdownPostAttributes
  html: string
  toc: { level: string; content: string }[]
}
