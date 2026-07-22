export const PREFERRED_BLOG_CATEGORIES = [
  'Experience',
  'tech',
  'essay',
  'share',
  'project',
] as const

const categorySortIndex = new Map(
  PREFERRED_BLOG_CATEGORIES.map((category, index) => [
    canonicalBlogCategoryKey(category),
    index,
  ])
)

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

export function compareBlogCategories(a: string, b: string) {
  const aIndex = categorySortIndex.get(canonicalBlogCategoryKey(a)) ?? 999
  const bIndex = categorySortIndex.get(canonicalBlogCategoryKey(b)) ?? 999

  return aIndex === bIndex ? a.localeCompare(b) : aIndex - bIndex
}
