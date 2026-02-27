import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UseSearchOptions<T> {
  items: T[]
  searchFn: (item: T, query: string) => boolean
}

export function useSearch<T>({ items, searchFn }: UseSearchOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev)
        if (query) {
          newParams.set('q', query)
        } else {
          newParams.delete('q')
        }
        return newParams
      })
    },
    [setSearchParams]
  )

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [setSearchQuery])

  const searchResults = useMemo(() => {
    if (!searchQuery) return items
    return items.filter((item) => searchFn(item, searchQuery))
  }, [items, searchQuery, searchFn])

  return {
    searchQuery,
    setSearchQuery,
    clearSearch,
    searchResults,
  }
}
