import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useBlogPosts } from '../hooks/useBlogPosts'
import { BlogFilter } from '../components/blog/BlogFilter'
import { BlogPostCard } from '../components/blog/BlogPostCard'
import { SearchStatus } from '../components/search/SearchStatus'
import { Seo } from '../components/seo/Seo'
import {
  DEFAULT_TITLE,
  buildBreadcrumbSchema,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '../components/seo/shared'

export function Blog() {
  const { t } = useTranslation()
  const siteUrl = getSiteUrl()
  const blogUrl = toAbsoluteUrl('/blog', siteUrl)
  const pageTitle = t('blog.title')
  const collectionPageSchema: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${pageTitle} | ${DEFAULT_TITLE}`,
    url: blogUrl,
    description: t('blog.description'),
    isPartOf: {
      '@type': 'WebSite',
      name: DEFAULT_TITLE,
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

  return (
    <>
      <Seo title={pageTitle} jsonLd={[collectionPageSchema, breadcrumbSchema]} />
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

      <motion.div layout className="space-y-6">
        <AnimatePresence mode="popLayout">
          {posts.length > 0 ? (
            posts.map((post) => <BlogPostCard key={post.id} post={post} />)
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-slate-500 dark:text-slate-400"
            >
              {t('blog.search.noResults')}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
