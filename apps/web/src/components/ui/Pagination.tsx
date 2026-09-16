import { useEffect, useId, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'framer-motion'
import { cn } from '@/lib/classNames'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

interface PaginationControlsProps extends PaginationProps {
  floating: boolean
  layoutId: string
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: (number | '...')[] = [1]
  let start = Math.max(2, currentPage - 1)
  let end = Math.min(totalPages - 1, currentPage + 1)

  if (currentPage <= 3) end = Math.min(totalPages - 1, 4)
  if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 3)

  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('...')
  if (totalPages > 1) pages.push(totalPages)

  return pages
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className,
  floating,
  layoutId,
}: PaginationControlsProps) {
  const reduceMotion = useReducedMotion()
  const iconButtonClass = floating
    ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800'
    : 'shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'

  return (
    <motion.nav
      layoutId={layoutId}
      className={cn(
        floating
          ? 'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[75] flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200/80 bg-white/92 p-1 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-[var(--border-color)] dark:bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)]'
          : 'scrollbar-hide flex max-w-full min-w-0 items-center justify-center gap-1 overflow-x-auto px-1 sm:gap-2',
        className
      )}
      aria-label="Pagination"
      data-pagination-floating={floating ? 'true' : 'false'}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.94, y: 8 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 430, damping: 34, mass: 0.72 }
      }
    >
      {!floating ? (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn('hidden sm:inline-flex', iconButtonClass)}
          aria-label="First page"
        >
          <ChevronsLeft size={18} />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={iconButtonClass}
        aria-label="Previous page"
      >
        <ChevronLeft size={floating ? 17 : 18} />
      </button>

      {floating ? (
        <span
          className="min-w-14 px-1 text-center text-xs font-medium text-slate-600 tabular-nums dark:text-slate-300"
          aria-live="polite"
        >
          {currentPage} / {totalPages}
        </span>
      ) : (
        <div className="mx-1 flex shrink-0 items-center gap-1 sm:mx-2">
          {getPageNumbers(currentPage, totalPages).map((page, index) =>
            page === '...' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-slate-400 select-none"
              >
                ...
              </span>
            ) : (
              <button
                type="button"
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'h-8 min-w-[2rem] rounded-lg px-2 text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                )}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={iconButtonClass}
        aria-label="Next page"
      >
        <ChevronRight size={floating ? 17 : 18} />
      </button>

      {!floating ? (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn('hidden sm:inline-flex', iconButtonClass)}
          aria-label="Last page"
        >
          <ChevronsRight size={18} />
        </button>
      ) : null}
    </motion.nav>
  )
}

export function Pagination(props: PaginationProps) {
  const { totalPages } = props
  const restingPositionRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isAtRestingPosition, setIsAtRestingPosition] = useState(true)
  const layoutId = `pagination-${useId()}`

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')
    let observer: IntersectionObserver | null = null

    const syncMode = () => {
      observer?.disconnect()
      observer = null
      setIsMobile(mediaQuery.matches)

      if (!mediaQuery.matches) {
        setIsAtRestingPosition(true)
        return
      }

      const restingPosition = restingPositionRef.current
      if (!restingPosition) return

      observer = new IntersectionObserver(
        ([entry]) => setIsAtRestingPosition(entry.isIntersecting),
        { threshold: 0.2 }
      )
      observer.observe(restingPosition)
    }

    syncMode()
    mediaQuery.addEventListener('change', syncMode)

    return () => {
      observer?.disconnect()
      mediaQuery.removeEventListener('change', syncMode)
    }
  }, [])

  if (totalPages <= 1) return null

  const showFloating = isMobile && !isAtRestingPosition

  return (
    <LayoutGroup id={layoutId}>
      <div
        ref={restingPositionRef}
        className="mt-12 flex min-h-10 items-center justify-center"
        data-pagination-resting-position="true"
      >
        {!showFloating ? (
          <PaginationControls {...props} floating={false} layoutId={layoutId} />
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {showFloating ? (
          <PaginationControls
            {...props}
            key="floating-pagination"
            floating
            layoutId={layoutId}
          />
        ) : null}
      </AnimatePresence>
    </LayoutGroup>
  )
}
