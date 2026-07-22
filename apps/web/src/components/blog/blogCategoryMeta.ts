import type { IconType } from 'react-icons'
import {
  BiAccessibility,
  BiBomb,
  BiBowlRice,
  BiCategory,
  BiChip,
  BiDirections,
} from 'react-icons/bi'
import { canonicalBlogCategoryKey } from '@/lib/blog/categories'

type BlogCategoryMeta = {
  icon: IconType
  textClassName: string
  activeClassName: string
  translationKey: string
}

const defaultCategoryMeta: BlogCategoryMeta = {
  icon: BiCategory,
  textClassName: 'text-slate-600 dark:text-slate-300',
  activeClassName:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  translationKey: 'blog.filter.allCategories',
}

const categoryMetaByKey: Record<string, BlogCategoryMeta> = {
  experience: {
    icon: BiAccessibility,
    textClassName: 'text-red-500 dark:text-red-400',
    activeClassName:
      'bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-400',
    translationKey: 'blog.categories.experience',
  },
  tech: {
    icon: BiChip,
    textClassName: 'text-blue-500 dark:text-blue-400',
    activeClassName:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/35 dark:text-blue-400',
    translationKey: 'blog.categories.tech',
  },
  essay: {
    icon: BiBowlRice,
    textClassName: 'text-emerald-500 dark:text-emerald-400',
    activeClassName:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-400',
    translationKey: 'blog.categories.essay',
  },
  share: {
    icon: BiDirections,
    textClassName: 'text-orange-500 dark:text-orange-400',
    activeClassName:
      'bg-orange-50 text-orange-600 dark:bg-orange-950/35 dark:text-orange-400',
    translationKey: 'blog.categories.share',
  },
  project: {
    icon: BiBomb,
    textClassName: 'text-cyan-500 dark:text-cyan-400',
    activeClassName:
      'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/35 dark:text-cyan-400',
    translationKey: 'blog.categories.project',
  },
}

export function getBlogCategoryMeta(category?: string | null) {
  const key = canonicalBlogCategoryKey(category)
  return categoryMetaByKey[key] ?? defaultCategoryMeta
}

export function getBlogCategoryTranslationKey(category?: string | null) {
  return getBlogCategoryMeta(category).translationKey
}
