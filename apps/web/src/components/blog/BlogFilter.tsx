import { useTranslation } from 'react-i18next'
import { ListFilter, Check, ChevronDown, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'
import type { SortBy } from '../../hooks/useBlogPosts'
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

function FilterTrigger({
  selectedCategory,
}: {
  selectedCategory: string | null
}) {
  const { isOpen } = useDropdown()
  const { t } = useTranslation()
  return (
    <DropdownTrigger
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors',
        'hover:bg-slate-50 hover:text-slate-900',
        'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      )}
    >
      <ListFilter size={16} />
      <span>{selectedCategory || t('blog.filter.allCategories')}</span>
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
          className="w-auto min-w-[8rem] sm:right-0 sm:left-auto sm:origin-top-right"
        >
          <DropdownItem
            className={cn(
              'flex w-full items-center justify-between',
              !selectedCategory &&
                'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
            )}
            onClick={() => onSelectCategory(null)}
          >
            {t('blog.filter.allCategories')}
            {!selectedCategory && <Check size={14} />}
          </DropdownItem>

          {allCategories.map((category) => (
            <DropdownItem
              key={category}
              className={cn(
                'flex w-full items-center justify-between',
                selectedCategory === category &&
                  'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              )}
              onClick={() => onSelectCategory(category)}
            >
              <span>{category}</span>
              {selectedCategory === category && <Check size={14} />}
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
          'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
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
