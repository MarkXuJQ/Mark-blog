import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useBlogPosts } from '../hooks/useBlogPosts'
import { BlogFilter } from '../components/blog/BlogFilter'
import { BlogPostCard } from '../components/blog/BlogPostCard'
import { SearchStatus } from '../components/search/SearchStatus'

export function Blog() {
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
  } = useBlogPosts()

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {t('blog.title')}
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
