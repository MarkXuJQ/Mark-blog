export type BlogSortBy = 'date' | 'updated'

export type BlogViewState = {
  currentPage: number
  scrollY: number
  searchQuery: string
  selectedCategory: string | null
  sortBy: BlogSortBy
}

export type BlogNavigationState = {
  fromBlogList?: boolean
  preserveScroll?: boolean
  returnTo?: string
  viewState?: BlogViewState
  transitionPostSlug?: string
}

const BLOG_VIEW_STATE_KEY_PREFIX = 'blog-view-state:'

function getBlogViewStateKey(language: string) {
  return `${BLOG_VIEW_STATE_KEY_PREFIX}${language.startsWith('zh') ? 'zh' : 'en'}`
}

export function readBlogViewState(language: string, searchQuery: string) {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(getBlogViewStateKey(language))
    if (!raw) return null

    const value = JSON.parse(raw) as Partial<BlogViewState>
    if (!isBlogViewState(value) || value.searchQuery !== searchQuery) {
      return null
    }

    return {
      currentPage: Math.max(1, Math.floor(value.currentPage)),
      scrollY: Math.max(0, value.scrollY),
      searchQuery,
      selectedCategory:
        typeof value.selectedCategory === 'string'
          ? value.selectedCategory
          : null,
      sortBy: value.sortBy,
    } satisfies BlogViewState
  } catch {
    return null
  }
}

export function isBlogViewState(value: unknown): value is BlogViewState {
  if (!value || typeof value !== 'object') return false

  const state = value as Partial<BlogViewState>
  return (
    typeof state.currentPage === 'number' &&
    typeof state.scrollY === 'number' &&
    typeof state.searchQuery === 'string' &&
    (state.selectedCategory === null ||
      typeof state.selectedCategory === 'string') &&
    (state.sortBy === 'date' || state.sortBy === 'updated')
  )
}

export function writeBlogViewState(language: string, state: BlogViewState) {
  try {
    window.sessionStorage.setItem(
      getBlogViewStateKey(language),
      JSON.stringify(state)
    )
  } catch {
    // Browsing still works when session storage is unavailable.
  }
}

export function getBlogNavigationState(value: unknown): BlogNavigationState {
  if (!value || typeof value !== 'object') return {}
  return value as BlogNavigationState
}
