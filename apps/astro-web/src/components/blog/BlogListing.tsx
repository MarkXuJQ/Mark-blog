import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlogPosts } from '../../hooks/useBlogPosts'
import { BlogFilter } from './BlogFilter'
import { BlogPostCard } from './BlogPostCard'
import { SearchStatus } from '../search/SearchStatus'
import { Pagination } from '../ui/Pagination'
import { SearchInput } from '../search/SearchInput'
import type { BlogPost } from '../../types'
import '../../i18n'

const ITEMS_PER_PAGE = 10

interface BlogListingProps {
  allPosts: BlogPost[]
}

export function BlogListing({ allPosts }: BlogListingProps) {
  const { t } = useTranslation()
  const {
    posts,
    allCategories,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    toggleSort,
    searchQuery,
    clearSearch,
    setSearchQuery,
  } = useBlogPosts({ allPosts })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, sortBy])

  // Calculate pagination
  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE)
  const currentPosts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return posts.slice(start, start + ITEMS_PER_PAGE)
  }, [posts, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="w-full py-8">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-4">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {t('blog.title')}
          </h1>
          <SearchInput 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('blog.sidebar.search.placeholder')}
            containerClassName="w-full sm:w-64"
          />
          <SearchStatus
            query={searchQuery}
            count={posts.length}
            onClear={clearSearch}
          />
        </div>

        <BlogFilter
          allCategories={allCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          sortBy={sortBy}
          onToggleSort={toggleSort}
        />
      </div>

      <div className="space-y-8">
        {currentPosts.length > 0 ? (
          <>
            {currentPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-4 text-xl font-medium text-slate-500 dark:text-slate-400">
              {t('blog.search.noResults')}
            </p>
            <button
              onClick={clearSearch}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t('blog.search.clear')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
