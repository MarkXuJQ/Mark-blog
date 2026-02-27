import { useState, useMemo, useCallback } from 'react'
import { getAllPosts } from '../utils/posts'
import { useSearch } from './useSearch'
import type { BlogPost } from '../types'

export type SortBy = 'date' | 'updated'

export function useBlogPosts() {
  const allPosts = useMemo(() => getAllPosts(), [])

  // State
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('date')

  // Search Logic
  const searchFn = useCallback((post: BlogPost, query: string) => {
    const lowerQuery = query.toLowerCase()
    return (
      post.title.toLowerCase().includes(lowerQuery) ||
      post.summary?.toLowerCase().includes(lowerQuery) ||
      post.content.toLowerCase().includes(lowerQuery) ||
      post.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
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
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    allPosts.forEach((post) => post.tags?.forEach((tag) => tags.add(tag)))
    return Array.from(tags).sort()
  }, [allPosts])

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...searchedPosts]

    // Filter by Tag
    if (selectedTag) {
      result = result.filter((post) => post.tags?.includes(selectedTag))
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
  }, [searchedPosts, selectedTag, sortBy])

  // Actions
  const toggleSort = () => {
    setSortBy((prev) => (prev === 'date' ? 'updated' : 'date'))
  }

  return {
    posts: filteredAndSortedPosts,
    allTags,
    selectedTag,
    setSelectedTag,
    sortBy,
    toggleSort,
    searchQuery,
    clearSearch,
  }
}
