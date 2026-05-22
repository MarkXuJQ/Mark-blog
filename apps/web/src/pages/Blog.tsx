import { useState, useMemo, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BlogFilter } from '@/components/blog/BlogFilter'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { SearchStatus } from '@/components/search/SearchStatus'
import { SearchTriggerInput } from '@/components/search/SearchTriggerInput'
import { Seo } from '@/components/seo/Seo'
import {
  buildBreadcrumbSchema,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '@/components/seo/shared'
import { Pagination } from '@/components/ui/Pagination'
import { useBlogPosts } from '@/hooks/useBlogPosts'
import type { BlogListOutletContext } from '@/layouts/BlogListLayout'
import type { BlogPostSummary } from '@/types'

const ITEMS_PER_PAGE = 10

export function Blog() {
  const { t } = useTranslation()
  const { simpleMode = false } = useOutletContext<BlogListOutletContext>()
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
      <div
        className={
          simpleMode
            ? 'mb-8 flex flex-col gap-5'
            : 'mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
        }
      >
        <div className="flex flex-col gap-2">
          <h1
            className={
              simpleMode
                ? 'text-3xl font-bold text-[var(--text-primary)]'
                : 'text-3xl font-bold text-slate-900 dark:text-slate-100'
            }
          >
            {pageTitle}
          </h1>
          <SearchStatus
            query={searchQuery}
            count={posts.length}
            onClear={clearSearch}
          />
        </div>

        {simpleMode ? (
          <div className="flex flex-col gap-4">
            <SearchTriggerInput
              placeholder={t('blog.sidebar.search.placeholder')}
              query={searchQuery}
              iconClassName="left-0 text-[var(--text-secondary)]"
              className="rounded-none border-0 border-b border-[var(--border-color)] bg-transparent px-0 py-2 pl-7 text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-secondary)] focus:border-[color-mix(in_srgb,var(--brand-400)_72%,transparent)] focus:ring-0 dark:border-[var(--border-color)] dark:bg-transparent dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)] dark:focus:border-[color-mix(in_srgb,var(--brand-400)_72%,transparent)]"
            />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link
                to="/archive"
                className="font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {t('blog.sidebar.archive.title')}
              </Link>
              <BlogFilter
                allCategories={allCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                sortBy={sortBy}
                onToggleSort={toggleSort}
                simple
                hideSort
              />
            </div>
          </div>
        ) : (
          <BlogFilter
            allCategories={allCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            sortBy={sortBy}
            onToggleSort={toggleSort}
          />
        )}
      </div>

      <div className={simpleMode ? 'space-y-0' : 'space-y-6'}>
        {currentPosts.length > 0 ? (
          <>
            {currentPosts.map((post) => (
              simpleMode ? (
                <SimpleBlogPostItem key={post.id} post={post} />
              ) : (
                <BlogPostCard key={post.id} post={post} />
              )
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

function SimpleBlogPostItem({ post }: { post: BlogPostSummary }) {
  return (
    <article className="py-6 first:pt-0">
      <Link to={`/blog/${post.slug}`} className="group block">
        <h2 className="text-2xl font-bold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[color-mix(in_srgb,var(--brand-400)_72%,var(--text-primary)_28%)]">
          {post.title}
        </h2>
        {post.summary ? (
          <p className="mt-3 text-[0.98rem] leading-7 text-[var(--text-secondary)]">
            {post.summary}
          </p>
        ) : null}
      </Link>
    </article>
  )
}
