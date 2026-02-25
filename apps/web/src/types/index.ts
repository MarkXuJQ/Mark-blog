export interface BlogPost {
  id: string
  title: string
  slug: string
  date: string
  summary: string
  content: string
  tags?: string[]
}

export interface MarkdownPost {
  attributes: {
    title: string
    date: string
    summary: string
    tags?: string[]
    [key: string]: any
  }
  html: string
  toc: any
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
