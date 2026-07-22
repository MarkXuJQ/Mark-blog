import enQuickFixes from '@content/timeline/quickfix/en.json'
import zhQuickFixes from '@content/timeline/quickfix/zh.json'
import enEvents from '@content/timeline/website/en.json'
import zhEvents from '@content/timeline/website/zh.json'

export interface TimelineItem {
  id: string
  content: string
  date?: string
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

const timelineByLanguage = {
  en: {
    events: enEvents as TimelineEvent[],
    quickFixes: enQuickFixes as QuickFixGroup[],
  },
  zh: {
    events: zhEvents as TimelineEvent[],
    quickFixes: zhQuickFixes as QuickFixGroup[],
  },
}

export function getTimelineContent(language: string) {
  return timelineByLanguage[language.startsWith('zh') ? 'zh' : 'en']
}
