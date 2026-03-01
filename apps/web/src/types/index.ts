export interface BlogPost {
  id: string
  title: string
  slug: string
  date: string
  updated?: string
  summary: string
  content: string
  tags?: string[]
  category?: string
}

export interface MarkdownPost {
  attributes: {
    title: string
    date: string
    updated?: string
    summary: string
    tags?: string[]
    category?: string
    [key: string]: unknown
  }
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
  categories?: TimelineCategory[]
}
