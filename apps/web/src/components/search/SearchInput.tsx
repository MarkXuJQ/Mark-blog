import { Search } from 'lucide-react'
import { forwardRef, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  containerClassName?: string
  rightSlot?: ReactNode
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, containerClassName, onSearch, onKeyDown, rightSlot, ...props },
  ref
) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(e.currentTarget.value)
    }
    onKeyDown?.(e)
  }

  return (
    <div className={cn('relative flex items-center', containerClassName)}>
      <Search className="absolute left-3 text-slate-400" size={18} />
      <input
        ref={ref}
        type="text"
        className={cn(
          'w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 pl-10 text-sm outline-none transition-all',
          rightSlot ? 'pr-28' : '',
          'placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-400',
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {rightSlot ? (
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      ) : null}
    </div>
  )
})
