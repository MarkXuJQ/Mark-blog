import { useTranslation } from 'react-i18next'
import { ChevronDown, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/classNames'
import type { SortBy } from '@/hooks/useBlogPosts'
import { canonicalBlogCategoryKey } from '@/lib/blog/categories'
import {
  getBlogCategoryMeta,
  getBlogCategoryTranslationKey,
} from './blogCategoryMeta'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@/components/ui/Dropdown'
import { useDropdown } from '@/hooks/useDropdown'

interface BlogFilterProps {
  allCategories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  sortBy: SortBy
  onToggleSort: () => void
  categoryCounts?: Record<string, number>
  totalPostsCount?: number
  simple?: boolean
  hideSort?: boolean
}

function CategoryMenuLabel({
  category,
  simple = false,
  count,
  active = false,
}: {
  category?: string | null
  simple?: boolean
  count?: number
  active?: boolean
}) {
  const { t } = useTranslation()
  const meta = getBlogCategoryMeta(category)
  const Icon = meta.icon
  const label = category
    ? t(getBlogCategoryTranslationKey(category), category)
    : t('blog.filter.allCategories')

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-2.5 text-[0.95rem] font-medium transition-colors',
        active
          ? cn('font-semibold', meta.textClassName)
          : 'text-slate-700 dark:text-slate-200',
        !simple && 'w-full justify-between'
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2.5">
        {!simple && (
          <Icon
            aria-hidden="true"
            className={cn(
              'h-[1.125rem] w-[1.125rem] shrink-0',
              active && meta.textClassName
            )}
          />
        )}
        <span className="min-w-0 truncate">{label}</span>
      </span>
      {typeof count === 'number' && !simple ? (
        <span
          className={cn(
            'shrink-0 text-[0.86rem] font-semibold tabular-nums transition-colors',
            active ? meta.textClassName : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {count}
        </span>
      ) : null}
    </span>
  )
}

function FilterTrigger({
  selectedCategory,
  simple = false,
}: {
  selectedCategory: string | null
  simple?: boolean
}) {
  const { isOpen } = useDropdown()
  const { t } = useTranslation()
  const meta = getBlogCategoryMeta(selectedCategory)
  const Icon = meta.icon
  const label = selectedCategory
    ? t(getBlogCategoryTranslationKey(selectedCategory), selectedCategory)
    : t('blog.filter.allCategories')

  return (
    <DropdownTrigger
      className={cn(
        'flex max-w-[48vw] min-w-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-[0.95rem] font-medium text-slate-700 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] transition-[background-color,color,box-shadow] sm:max-w-none dark:shadow-none',
        'hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm',
        'dark:bg-[#17191c] dark:text-slate-300 dark:hover:bg-[#23262c] dark:hover:text-slate-100',
        simple &&
          'border-transparent bg-transparent px-0 py-0 text-[var(--text-secondary)] hover:bg-transparent hover:text-[var(--text-primary)] dark:border-transparent dark:bg-transparent dark:hover:bg-transparent'
      )}
    >
      {!simple && (
        <Icon className={cn('h-[1.1rem] w-[1.1rem]', meta.textClassName)} />
      )}
      <span className={cn('min-w-0 truncate', !simple && meta.textClassName)}>
        {label}
      </span>
      {!simple && (
        <ChevronDown
          size={14}
          className={cn(
            'transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      )}
    </DropdownTrigger>
  )
}

function isCategoryOptionActive(
  selectedCategory: string | null,
  category?: string | null
) {
  if (!category) return selectedCategory === null
  if (!selectedCategory) return false

  return (
    canonicalBlogCategoryKey(selectedCategory) ===
    canonicalBlogCategoryKey(category)
  )
}

function CategoryDropdownItem({
  category,
  selectedCategory,
  onSelectCategory,
  count,
}: {
  category?: string | null
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  count: number
}) {
  const isActive = isCategoryOptionActive(selectedCategory, category)
  const meta = getBlogCategoryMeta(category)

  return (
    <DropdownItem
      className={cn(
        'flex w-full min-w-0 items-center px-2.5 py-2',
        isActive && meta.activeClassName
      )}
      onClick={() => onSelectCategory(category ?? null)}
    >
      <CategoryMenuLabel category={category} count={count} active={isActive} />
    </DropdownItem>
  )
}

function SimpleCategoryOption({
  category,
  selectedCategory,
  onSelectCategory,
}: {
  category?: string | null
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
}) {
  const { t } = useTranslation()
  const isActive = category
    ? selectedCategory === category
    : selectedCategory === null
  const label = category
    ? t(getBlogCategoryTranslationKey(category), category)
    : t('blog.filter.allCategories')

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onSelectCategory(category ?? null)}
      className={cn(
        'cursor-pointer border-b border-transparent pb-0.5 text-sm font-medium whitespace-nowrap text-[var(--text-secondary)] transition-colors',
        'hover:text-[var(--text-primary)]',
        isActive &&
          'border-[color-mix(in_srgb,var(--brand-400)_78%,transparent)] text-[var(--text-primary)]'
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span>{label}</span>
      </span>
    </button>
  )
}

function RichSortButton({
  sortBy,
  onToggleSort,
}: {
  sortBy: SortBy
  onToggleSort: () => void
}) {
  const { t } = useTranslation()
  const { setIsOpen } = useDropdown()

  return (
    <button
      onClick={() => {
        setIsOpen(false)
        onToggleSort()
      }}
      className={cn(
        'hidden cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.3)] transition-[background-color,color,box-shadow] select-none active:scale-95 sm:flex dark:shadow-none',
        'hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm',
        'dark:bg-[#17191c] dark:text-slate-300 dark:hover:bg-[#23262c] dark:hover:text-slate-100'
      )}
    >
      <motion.div
        layout
        transition={{
          type: 'spring',
          stiffness: 700,
          damping: 30,
        }}
        className="flex items-center gap-2"
      >
        <div className="relative h-4 w-4 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={sortBy}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <ArrowDown
                size={16}
                className={cn(
                  sortBy === 'date' ? 'text-blue-500' : 'text-green-500'
                )}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <span className="min-w-[4.5rem] text-left">
          {sortBy === 'date' ? t('blog.sort.created') : t('blog.sort.updated')}
        </span>
      </motion.div>
    </button>
  )
}

export function BlogFilter({
  allCategories,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onToggleSort,
  categoryCounts = {},
  totalPostsCount = 0,
  simple = false,
  hideSort = false,
}: BlogFilterProps) {
  const { t } = useTranslation()

  if (simple) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <SimpleCategoryOption
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
        {allCategories.map((category) => (
          <SimpleCategoryOption
            key={category}
            category={category}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
          />
        ))}

        {!hideSort && (
          <button
            onClick={onToggleSort}
            className="hidden cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent px-0 py-0 text-sm font-medium text-[var(--text-secondary)] transition-colors select-none hover:bg-transparent hover:text-[var(--text-primary)] active:scale-95 sm:flex dark:border-transparent dark:bg-transparent dark:hover:bg-transparent"
          >
            <motion.div
              layout
              transition={{
                type: 'spring',
                stiffness: 700,
                damping: 30,
              }}
              className="flex items-center gap-2"
            >
              <span className="min-w-[4.5rem] text-left">
                {sortBy === 'date'
                  ? t('blog.sort.created')
                  : t('blog.sort.updated')}
              </span>
            </motion.div>
          </button>
        )}
      </div>
    )
  }

  return (
    <Dropdown className="flex items-center gap-3 sm:ml-auto sm:w-fit">
      {/* Filter Dropdown */}
      <FilterTrigger selectedCategory={selectedCategory} simple={simple} />

      <DropdownContent
        align="end"
        className="w-[min(9.75rem,calc(100vw-1.5rem))] min-w-0 p-1.5 sm:w-[19rem]"
      >
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <CategoryDropdownItem
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            count={totalPostsCount}
          />

          {allCategories.map((category) => (
            <CategoryDropdownItem
              key={category}
              category={category}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              count={categoryCounts[canonicalBlogCategoryKey(category)] ?? 0}
            />
          ))}
        </div>
      </DropdownContent>

      {!hideSort && (
        <RichSortButton sortBy={sortBy} onToggleSort={onToggleSort} />
      )}
    </Dropdown>
  )
}
