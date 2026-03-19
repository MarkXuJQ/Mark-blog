import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  useDropdown,
} from './Dropdown'

type SelectValue = string | number

interface SelectOption<T extends SelectValue> {
  value: T
  label: string
}

interface SelectMenuProps<T extends SelectValue> {
  value: T
  options: Array<SelectOption<T>>
  onValueChange: (value: T) => void
  ariaLabel: string
  label?: string
  align?: 'start' | 'end'
  className?: string
  containerClassName?: string
  labelClassName?: string
  buttonClassName?: string
  menuClassName?: string
}

function SelectMenuTrigger(props: {
  selectedLabel: string
  ariaLabel: string
  className?: string
}) {
  const { selectedLabel, ariaLabel, className } = props
  const { isOpen } = useDropdown()

  return (
    <DropdownTrigger
      aria-label={ariaLabel}
      className={cn(
        'flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-full bg-transparent font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200',
        isOpen && 'text-slate-950 dark:text-white',
        className
      )}
    >
      <span className="truncate">{selectedLabel}</span>
      <ChevronDown
        size={14}
        className={cn(
          'shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </DropdownTrigger>
  )
}

export function SelectMenu<T extends SelectValue>(props: SelectMenuProps<T>) {
  const {
    value,
    options,
    onValueChange,
    ariaLabel,
    label,
    align = 'end',
    className,
    containerClassName,
    labelClassName,
    buttonClassName,
    menuClassName,
  } = props

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0] ?? null

  if (!selectedOption) return null

  return (
    <Dropdown className={className}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
          containerClassName
        )}
      >
        {label ? (
          <span className={cn('shrink-0', labelClassName)}>{label}</span>
        ) : null}

        <SelectMenuTrigger
          selectedLabel={selectedOption.label}
          ariaLabel={ariaLabel}
          className={buttonClassName}
        />
      </div>

      <DropdownContent
        align={align}
        className={cn(
          'w-auto min-w-[10rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10',
          menuClassName
        )}
      >
        {options.map((option) => {
          const isActive = option.value === value

          return (
            <DropdownItem
              key={String(option.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-4 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              )}
              onClick={() => onValueChange(option.value)}
            >
              <span>{option.label}</span>
              {isActive ? <Check size={14} /> : null}
            </DropdownItem>
          )
        })}
      </DropdownContent>
    </Dropdown>
  )
}
