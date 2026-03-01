import { useState, useMemo, useCallback } from 'react'
import { getAllPosts } from '../utils/posts'
import { useSearch } from './useSearch'
import type { BlogPost } from '../types'

export type SortBy = 'date' | 'updated'

export function useBlogPosts() {
  const allPosts = useMemo(() => getAllPosts(), [])

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('date')

  // Search Logic
  const searchFn = useCallback((post: BlogPost, query: string) => {
    const lowerQuery = query.toLowerCase()
    return (
      post.title.toLowerCase().includes(lowerQuery) ||
      post.summary?.toLowerCase().includes(lowerQuery) ||
      post.content.toLowerCase().includes(lowerQuery) ||
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

  // Derived state
  const allCategories = useMemo(() => {
    const categories = new Set<string>()
    allPosts.forEach((post) => {
      if (post.category) categories.add(post.category)
    })
    return Array.from(categories).sort()
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
