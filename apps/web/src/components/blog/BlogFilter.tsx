import { useTranslation } from 'react-i18next'
import { ChevronDown, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SortBy } from '@/hooks/useBlogPosts'
import {
  getBlogCategoryMeta,
  getBlogCategoryTranslationKey,
} from './categoryMeta'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  useDropdown,
} from '../ui/Dropdown'

interface BlogFilterProps {
  allCategories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  sortBy: SortBy
  onToggleSort: () => void
  simple?: boolean
  hideSort?: boolean
}

function CategoryMenuLabel({
  category,
  simple = false,
}: {
  category?: string | null
  simple?: boolean
}) {
  const { t } = useTranslation()
  const meta = getBlogCategoryMeta(category)
  const Icon = meta.icon
  const label = category
    ? t(getBlogCategoryTranslationKey(category), category)
    : t('blog.filter.allCategories')

  return (
    <span className="inline-flex items-center gap-2.5 text-[0.95rem] font-medium text-slate-700 dark:text-slate-200">
      {!simple && (
        <Icon
          aria-hidden="true"
          className="h-[1.125rem] w-[1.125rem] shrink-0"
        />
      )}
      <span>{label}</span>
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
        'flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.95rem] font-medium text-slate-700 transition-colors',
        'hover:bg-slate-50 hover:text-slate-900',
        'dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-300 dark:hover:bg-[#23262c] dark:hover:text-slate-100',
        simple &&
          'border-transparent bg-transparent px-0 py-0 text-[var(--text-secondary)] hover:bg-transparent hover:text-[var(--text-primary)] dark:border-transparent dark:bg-transparent dark:hover:bg-transparent'
      )}
    >
      {!simple && (
        <Icon className={cn('h-[1.1rem] w-[1.1rem]', meta.textClassName)} />
      )}
      <span className={cn(!simple && meta.textClassName)}>{label}</span>
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
        'cursor-pointer whitespace-nowrap border-b border-transparent pb-0.5 text-sm font-medium text-[var(--text-secondary)] transition-colors',
        'hover:text-[var(--text-primary)]',
        isActive &&
          'border-[color-mix(in_srgb,var(--brand-400)_78%,transparent)] text-[var(--text-primary)]'
      )}
    >
      {label}
    </button>
  )
}

export function BlogFilter({
  allCategories,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onToggleSort,
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
            className="flex cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent px-0 py-0 text-sm font-medium text-[var(--text-secondary)] transition-colors select-none hover:bg-transparent hover:text-[var(--text-primary)] active:scale-95 dark:border-transparent dark:bg-transparent dark:hover:bg-transparent"
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
    <div className="flex items-center gap-3">
      {/* Filter Dropdown */}
      <Dropdown className="relative">
        <FilterTrigger selectedCategory={selectedCategory} simple={simple} />

        <DropdownContent
          align="start"
          className="w-max min-w-0 p-1.5 sm:right-0 sm:left-auto sm:origin-top-right"
        >
          <DropdownItem
            className="flex w-full items-center whitespace-nowrap px-3 py-2.5"
            onClick={() => onSelectCategory(null)}
          >
            <CategoryMenuLabel simple={simple} />
          </DropdownItem>

          {allCategories.map((category) => (
            <DropdownItem
              key={category}
              className="flex w-full items-center whitespace-nowrap px-3 py-2.5"
              onClick={() => onSelectCategory(category)}
            >
              <CategoryMenuLabel category={category} simple={simple} />
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>

      {!hideSort && (
        <button
          onClick={onToggleSort}
          className={cn(
            'flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors select-none active:scale-95',
            'hover:bg-slate-50 hover:text-slate-900',
            'dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-300 dark:hover:bg-[#23262c] dark:hover:text-slate-100',
            simple &&
              'border-transparent bg-transparent px-0 py-0 text-[var(--text-secondary)] hover:bg-transparent hover:text-[var(--text-primary)] dark:border-transparent dark:bg-transparent dark:hover:bg-transparent'
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
            {!simple && (
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
            )}
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
