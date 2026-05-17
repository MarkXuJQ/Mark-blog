import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  canonicalBlogCategoryKey,
  compareBlogCategories,
  PREFERRED_BLOG_CATEGORIES,
} from '@/components/blog/categoryMeta'
import { getAllPostSummaries } from '@/lib/content'
import type { BlogPostSummary } from '@/types'
import { useSearch } from './useSearch'

export type SortBy = 'date' | 'updated'

export function useBlogPosts() {
  const { i18n } = useTranslation()
  const allPosts = useMemo(
    () => getAllPostSummaries(i18n.language),
    [i18n.language]
  )

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('date')

  // Search Logic
  const searchFn = useCallback((post: BlogPostSummary, query: string) => {
    const lowerQuery = query.toLowerCase()
    return (
      post.title.toLowerCase().includes(lowerQuery) ||
      post.summary?.toLowerCase().includes(lowerQuery) ||
      post.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      post.category?.toLowerCase().includes(lowerQuery) ||
      false
    )
  }, [])

  const {
    searchQuery,
    searchResults: searchedPosts,
    clearSearch,
  } = useSearch({
    items: allPosts,
    searchFn,
  })

  useEffect(() => {
    setSelectedCategory(null)
    if (searchQuery) {
      clearSearch()
    }
  }, [clearSearch, i18n.language, searchQuery])

  // Derived state
  const allCategories = useMemo(() => {
    const categories = new Map<string, string>()

    PREFERRED_BLOG_CATEGORIES.forEach((category) => {
      categories.set(canonicalBlogCategoryKey(category), category)
    })

    allPosts.forEach((post) => {
      if (post.category) {
        categories.set(canonicalBlogCategoryKey(post.category), post.category)
      }
    })

    return Array.from(categories.values()).sort(compareBlogCategories)
  }, [allPosts])

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...searchedPosts]

    // Filter by Category
    if (selectedCategory) {
      result = result.filter((post) => post.category === selectedCategory)
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(
        sortBy === 'date' ? a.date : a.updated || a.date
      ).getTime()
      const dateB = new Date(
        sortBy === 'date' ? b.date : b.updated || b.date
      ).getTime()
      return dateB - dateA
    })
    return result
  }, [searchedPosts, selectedCategory, sortBy])

  // Actions
  const toggleSort = () => {
    setSortBy((prev) => (prev === 'date' ? 'updated' : 'date'))
  }

  return {
    posts: filteredAndSortedPosts,
    allCategories,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    toggleSort,
    searchQuery,
    clearSearch,
  }
}
