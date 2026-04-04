import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlogPosts } from '../hooks/useBlogPosts'
import { BlogFilter } from '../components/blog/BlogFilter'
import { BlogPostCard } from '../components/blog/BlogPostCard'
import { SearchStatus } from '../components/search/SearchStatus'
import { Pagination } from '../components/ui/Pagination'
import { Seo } from '../components/seo/Seo'
import {
  buildBreadcrumbSchema,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '../components/seo/shared'

const ITEMS_PER_PAGE = 10

export function Blog() {
  const { t } = useTranslation()
  const siteUrl = getSiteUrl()
  const blogUrl = toAbsoluteUrl('/blog', siteUrl)
  const pageTitle = t('blog.title')
  const collectionPageSchema: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${pageTitle} | ${t('siteTitle')}`,
    url: blogUrl,
    description: t('blog.description'),
    isPartOf: {
      '@type': 'WebSite',
      name: t('siteTitle'),
      url: siteUrl,
    },
  }
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t('nav.homepage'), url: siteUrl },
    { name: pageTitle, url: blogUrl },
  ])
  const {
    posts,
    allCategories,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    toggleSort,
    searchQuery,
    clearSearch,
  } = useBlogPosts()

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
    <>
      <Seo
        title={pageTitle}
        noindex={Boolean(searchQuery)}
        jsonLd={[collectionPageSchema, breadcrumbSchema]}
      />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {pageTitle}
          </h1>
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

      <div className="space-y-6">
        {currentPosts.length > 0 ? (
          <>
            {currentPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {t('blog.search.noResults')}
          </div>
        )}
      </div>
    </>
  )
}
