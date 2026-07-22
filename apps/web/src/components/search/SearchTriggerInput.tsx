import { SearchInput } from './SearchInput'
import { openGlobalSearch } from '@/lib/search/globalSearchBus'

export function SearchTriggerInput({
  placeholder,
  containerClassName,
  className,
  iconClassName,
  query,
  onTrigger,
}: {
  placeholder: string
  containerClassName?: string
  className?: string
  iconClassName?: string
  query?: string
  onTrigger?: () => void
}) {
  return (
    <SearchInput
      readOnly
      value=""
      placeholder={placeholder}
      containerClassName={containerClassName}
      iconClassName={iconClassName}
      className={className ? `cursor-pointer ${className}` : 'cursor-pointer'}
      onFocus={() => {
        onTrigger?.()
        openGlobalSearch(query)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        onTrigger?.()
        openGlobalSearch(query)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onTrigger?.()
          openGlobalSearch(query)
        }
      }}
    />
  )
}
