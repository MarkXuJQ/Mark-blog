export interface BlogPostSummary {
  id: string
  title: string
  slug: string
  date: string
  updated?: string
  summary: string
  image?: string
  tags?: string[]
  category?: string
}

export interface BlogPost extends BlogPostSummary {
  content: string
}

export interface MarkdownPostAttributes {
  title: string
  date: string
  updated?: string
  summary: string
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

export interface TimelineItem {
  id: string
  content: string
  date?: string // Optional date for specific items
  link?: string
}

export interface TimelineCategory {
  title: string
  items: TimelineItem[]
}

export interface TimelineEvent {
  date: string
  title: string
  description?: string
  notes?: TimelineItem[]
  categories?: TimelineCategory[]
}

export interface QuickFixGroup {
  id: string
  date: string
  content: string[]
}
