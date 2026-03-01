import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ListFilter,
  Check,
  ChevronDown,
  ArrowDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'
import type { SortBy } from '../../hooks/useBlogPosts'

interface BlogFilterProps {
  allTags: string[]
  selectedTag: string | null
  onSelectTag: (tag: string | null) => void
  sortBy: SortBy
  onToggleSort: () => void
}

export function BlogFilter({
  allTags,
  selectedTag,
  onSelectTag,
  sortBy,
  onToggleSort,
}: BlogFilterProps) {
  const { t } = useTranslation()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex items-center gap-3">
      {/* Filter Dropdown */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors cursor-pointer',
            'hover:bg-slate-50 hover:text-slate-900',
            'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          )}
        >
          <ListFilter size={16} />
          <span>{selectedTag || t('blog.filter.allTags')}</span>
          <ChevronDown
            size={14}
            className={cn(
              'transition-transform duration-200',
              isFilterOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'absolute top-full z-10 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none',
                'left-0 sm:left-auto sm:right-0 origin-top-left sm:origin-top-right',
                'dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10'
              )}
            >
              <button
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm cursor-pointer',
                  'text-slate-700 hover:bg-slate-100',
                  'dark:text-slate-300 dark:hover:bg-slate-800',
                  !selectedTag && 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                )}
                onClick={() => {
                  onSelectTag(null)
                  setIsFilterOpen(false)
                }}
              >
                {t('blog.filter.allTags')}
                {!selectedTag && <Check size={14} />}
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm cursor-pointer',
                    'text-slate-700 hover:bg-slate-100',
                    'dark:text-slate-300 dark:hover:bg-slate-800',
                    selectedTag === tag && 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  )}
                  onClick={() => {
                    onSelectTag(tag)
                    setIsFilterOpen(false)
                  }}
                >
                  #{tag}
                  {selectedTag === tag && <Check size={14} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sort Toggle Button (Elastic Animation) */}
      <button 
        onClick={onToggleSort} 
        className={cn(
          'flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors cursor-pointer select-none active:scale-95',
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
