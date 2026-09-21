import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/classNames'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  contentRef?: RefObject<HTMLElement | null>
}

interface PaginationControlsProps extends PaginationProps {
  sticky: boolean
  pageNumbers: (number | '...')[]
  contentCenterX: number | null
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
  sticky,
  pageNumbers,
  contentCenterX,
}: PaginationControlsProps) {
  const reduceMotion = useReducedMotion()
  const itemSize = sticky
    ? 'h-full min-w-8 text-sm'
    : 'h-full min-w-8 text-sm sm:min-w-9'

  return (
    <motion.nav
      layout
      className={cn(
        sticky
          ? 'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[75] flex h-8 w-fit max-w-[calc(100vw-2rem)] overflow-x-auto rounded-lg border border-slate-200/80 bg-white/92 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-[var(--border-color)] dark:bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)]'
          : 'scrollbar-hide flex h-8 w-fit max-w-full overflow-x-auto rounded-lg border border-slate-200/80 bg-white shadow-[0_10px_28px_-22px_rgba(15,23,42,0.38)] sm:h-9 dark:border-[var(--border-color)] dark:bg-[var(--surface-card)] dark:shadow-none',
        className
      )}
      style={
        sticky && contentCenterX !== null
          ? { left: contentCenterX, translate: '-50% 0' }
          : undefined
      }
      aria-label={`Page ${currentPage} of ${totalPages}`}
      data-pagination-sticky={sticky ? 'true' : 'false'}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 430, damping: 34, mass: 0.72 }
      }
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'flex shrink-0 items-center justify-center text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800',
          itemSize,
          'rounded-l-[7px]'
        )}
        aria-label="Previous page"
      >
        <ChevronLeft size={17} />
      </button>

      {pageNumbers.map((page, index) =>
        page === '...' ? (
          <button
            type="button"
            key={`ellipsis-${index}`}
            disabled
            className={cn(
              'shrink-0 text-slate-400 select-none dark:text-slate-500',
              itemSize
            )}
            aria-label="More pages"
          >
            ...
          </button>
        ) : (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'shrink-0 font-medium tabular-nums transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
              itemSize,
              currentPage === page
                ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300'
                : 'text-slate-600 dark:text-slate-300'
            )}
            aria-current={currentPage === page ? 'page' : undefined}
            aria-label={`Page ${page}`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'flex shrink-0 items-center justify-center text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800',
          itemSize,
          'rounded-r-[7px]'
        )}
        aria-label="Next page"
      >
        <ChevronRight size={17} />
      </button>
    </motion.nav>
  )
}

export function Pagination(props: PaginationProps) {
  const { contentRef, currentPage, totalPages } = props
  const paginationAnchorRef = useRef<HTMLDivElement>(null)
  const [isPaginationBelowViewport, setIsPaginationBelowViewport] =
    useState(true)
  const [hasReachedContent, setHasReachedContent] = useState(!contentRef)
  const [contentCenterX, setContentCenterX] = useState<number | null>(null)
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  useEffect(() => {
    const anchor = paginationAnchorRef.current
    if (!anchor) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const viewportBottom = entry.rootBounds?.bottom ?? window.innerHeight

        // A pagination anchor above the viewport is not a reason to show the
        // compact control again after the user has passed the list end.
        setIsPaginationBelowViewport(
          !entry.isIntersecting &&
            entry.boundingClientRect.top >= viewportBottom
        )
      },
      { threshold: 0.2 }
    )
    observer.observe(anchor)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const content = contentRef?.current
    if (!content) {
      setHasReachedContent(!contentRef)
      setContentCenterX(null)
      return
    }

    let frameId = 0
    const syncContentPosition = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        const { left, top, width } = content.getBoundingClientRect()
        setHasReachedContent(top <= window.innerHeight / 2)
        setContentCenterX(left + width / 2)
      })
    }

    syncContentPosition()
    window.addEventListener('scroll', syncContentPosition, { passive: true })
    window.addEventListener('resize', syncContentPosition)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(syncContentPosition)
    resizeObserver?.observe(content)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', syncContentPosition)
      window.removeEventListener('resize', syncContentPosition)
      resizeObserver?.disconnect()
    }
  }, [contentRef, totalPages])

  if (totalPages <= 1) return null

  const isSticky = hasReachedContent && isPaginationBelowViewport

  return (
    <div className="mt-12 flex min-h-9 justify-center sm:min-h-10">
      <PaginationControls
        {...props}
        sticky={isSticky}
        pageNumbers={pageNumbers}
        contentCenterX={contentCenterX}
      />
      <div ref={paginationAnchorRef} className="h-px" aria-hidden="true" />
    </div>
  )
}
