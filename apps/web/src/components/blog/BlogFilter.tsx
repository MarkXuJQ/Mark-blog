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
}

function CategoryMenuLabel({ category }: { category?: string | null }) {
  const { t } = useTranslation()
  const meta = getBlogCategoryMeta(category)
  const Icon = meta.icon
  const label = category
    ? t(getBlogCategoryTranslationKey(category), category)
    : t('blog.filter.allCategories')

  return (
    <span className="inline-flex items-center gap-2.5 text-[0.95rem] font-medium text-slate-700 dark:text-slate-200">
      <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem] shrink-0" />
      <span>{label}</span>
    </span>
  )
}

function FilterTrigger({
  selectedCategory,
}: {
  selectedCategory: string | null
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
        'dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-300 dark:hover:bg-[#23262c] dark:hover:text-slate-100'
      )}
    >
      <Icon className={cn('h-[1.1rem] w-[1.1rem]', meta.textClassName)} />
      <span className={meta.textClassName}>{label}</span>
      <ChevronDown
        size={14}
        className={cn(
          'transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </DropdownTrigger>
  )
}

export function BlogFilter({
  allCategories,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onToggleSort,
}: BlogFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3">
      {/* Filter Dropdown */}
      <Dropdown className="relative">
        <FilterTrigger selectedCategory={selectedCategory} />

        <DropdownContent
          align="start"
          className="w-max min-w-0 p-1.5 sm:right-0 sm:left-auto sm:origin-top-right"
        >
          <DropdownItem
            className="flex w-full items-center whitespace-nowrap px-3 py-2.5"
            onClick={() => onSelectCategory(null)}
          >
            <CategoryMenuLabel />
          </DropdownItem>

          {allCategories.map((category) => (
            <DropdownItem
              key={category}
              className="flex w-full items-center whitespace-nowrap px-3 py-2.5"
              onClick={() => onSelectCategory(category)}
            >
              <CategoryMenuLabel category={category} />
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>

      {/* Sort Toggle Button (Elastic Animation) */}
      <button
        onClick={onToggleSort}
        className={cn(
          'flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors select-none active:scale-95',
          'hover:bg-slate-50 hover:text-slate-900',
          'dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-300 dark:hover:bg-[#23262c] dark:hover:text-slate-100'
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
            {sortBy === 'date'
              ? t('blog.sort.created')
              : t('blog.sort.updated')}
          </span>
        </motion.div>
      </button>
    </div>
  )
}
