import { SearchInput } from './SearchInput'
import { openGlobalSearch } from './openGlobalSearch'

export function SearchTriggerInput({
  placeholder,
  containerClassName,
  query,
  onTrigger,
}: {
  placeholder: string
  containerClassName?: string
  query?: string
  onTrigger?: () => void
}) {
  return (
    <SearchInput
      readOnly
      value=""
      placeholder={placeholder}
      containerClassName={containerClassName}
      className="cursor-pointer"
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
