import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../utils/cn'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Calculate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    
    // Always show first page
    pages.push(1)

    // Calculate range around current page
    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)

    // Adjust if current page is near start
    if (currentPage <= 3) {
      end = Math.min(totalPages - 1, 4)
    }

    // Adjust if current page is near end
    if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3)
    }

    // Add ellipsis before range if needed
    if (start > 2) {
      pages.push('...')
    }

    // Add range
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Add ellipsis after range if needed
    if (end < totalPages - 1) {
      pages.push('...')
    }

    // Always show last page if totalPages > 1
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <nav
      className={cn('flex items-center justify-center gap-2 mt-12', className)}
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        aria-label="First page"
      >
        <ChevronsLeft size={18} />
      </button>
      
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-1 mx-2">
        {getPageNumbers().map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <span className="px-2 text-slate-400 select-none">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={cn(
                  'min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                )}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        aria-label="Next page"
      >
        <ChevronRight size={18} />
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        aria-label="Last page"
      >
        <ChevronsRight size={18} />
      </button>
    </nav>
  )
}