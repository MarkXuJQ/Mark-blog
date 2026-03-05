import { useMemo, useCallback, useState, useEffect } from 'react'

export interface UseSearchOptions<T> {
  items: T[]
  searchFn: (item: T, query: string) => boolean
}

export function useSearch<T>({ items, searchFn }: UseSearchOptions<T>) {
  const [searchQuery, setQuery] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setQuery(q)
  }, [])

  const setSearchQuery = useCallback(
    (query: string) => {
      setQuery(query)
      const params = new URLSearchParams(window.location.search)
      if (query) {
        params.set('q', query)
      } else {
        params.delete('q')
      }
      const newRelativePathQuery = window.location.pathname + '?' + params.toString()
      window.history.pushState(null, '', newRelativePathQuery)
    },
    []
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
