import { Search } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  containerClassName?: string
}

export function SearchInput({
  className,
  containerClassName,
  onSearch,
  onKeyDown,
  ...props
}: SearchInputProps) {
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
        type="text"
        className={cn(
          'w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 pl-10 text-sm outline-none transition-all',
          'placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-400',
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </div>
  )
}
