import type { IconType } from 'react-icons'
import {
  BiAccessibility,
  BiBomb,
  BiBowlRice,
  BiCategory,
  BiChip,
  BiDirections,
} from 'react-icons/bi'

export const PREFERRED_BLOG_CATEGORIES = [
  'Experience',
  'tech',
  'essay',
  'share',
  'project',
] as const

type BlogCategoryMeta = {
  icon: IconType
  textClassName: string
  activeClassName: string
  translationKey: string
  sortIndex: number
}

const defaultCategoryMeta: BlogCategoryMeta = {
  icon: BiCategory,
  textClassName: 'text-slate-600 dark:text-slate-300',
  activeClassName:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  translationKey: 'blog.filter.allCategories',
  sortIndex: 999,
}

const categoryMetaByKey: Record<string, BlogCategoryMeta> = {
  experience: {
    icon: BiAccessibility,
    textClassName: 'text-red-500 dark:text-red-400',
    activeClassName:
      'bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-400',
    translationKey: 'blog.categories.experience',
    sortIndex: 0,
  },
  tech: {
    icon: BiChip,
    textClassName: 'text-blue-500 dark:text-blue-400',
    activeClassName:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/35 dark:text-blue-400',
    translationKey: 'blog.categories.tech',
    sortIndex: 1,
  },
  essay: {
    icon: BiBowlRice,
    textClassName: 'text-emerald-500 dark:text-emerald-400',
    activeClassName:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-400',
    translationKey: 'blog.categories.essay',
    sortIndex: 2,
  },
  share: {
    icon: BiDirections,
    textClassName: 'text-orange-500 dark:text-orange-400',
    activeClassName:
      'bg-orange-50 text-orange-600 dark:bg-orange-950/35 dark:text-orange-400',
    translationKey: 'blog.categories.share',
    sortIndex: 3,
  },
  project: {
    icon: BiBomb,
    textClassName: 'text-cyan-500 dark:text-cyan-400',
    activeClassName:
      'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/35 dark:text-cyan-400',
    translationKey: 'blog.categories.project',
    sortIndex: 4,
  },
}

export function canonicalBlogCategoryKey(category?: string | null) {
  const key = category?.trim().toLowerCase()
  if (!key) return 'all'

  if (
    key === 'essay' ||
    key === 'life note' ||
    key === 'life-note' ||
    key === 'life_note' ||
    key === 'lifenote'
  ) {
    return 'essay'
  }

  if (key === 'projects') return 'project'

  return key
}

export function getBlogCategoryMeta(category?: string | null) {
  const key = canonicalBlogCategoryKey(category)
  return categoryMetaByKey[key] ?? defaultCategoryMeta
}

export function getBlogCategoryTranslationKey(category?: string | null) {
  return getBlogCategoryMeta(category).translationKey
}

export function compareBlogCategories(a: string, b: string) {
  const aMeta = getBlogCategoryMeta(a)
  const bMeta = getBlogCategoryMeta(b)

  if (aMeta.sortIndex !== bMeta.sortIndex) {
    return aMeta.sortIndex - bMeta.sortIndex
  }

  return a.localeCompare(b)
}
