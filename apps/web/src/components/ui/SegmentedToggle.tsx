import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type SegmentedToggleItem<T extends string> = {
  value: T
  content: ReactNode
  ariaLabel: string
  tooltip?: string
  knobClassName?: string
  activeTextClassName?: string
}

type SegmentedToggleProps<T extends string> = {
  value: T
  items: Array<SegmentedToggleItem<T>>
  onValueChange: (value: T) => void
  ariaLabel: string
  className?: string
  buttonClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: {
    container: 'p-0.5',
    button: 'h-8 px-3 text-xs',
  },
  md: {
    container: 'p-0.5',
    button: 'h-9 px-4 text-sm',
  },
  lg: {
    container: 'p-0.5',
    button: 'h-10 px-5 text-sm',
  },
} as const

export function SegmentedToggle<T extends string>({
  value,
  items,
  onValueChange,
  ariaLabel,
  className,
  buttonClassName,
  size = 'md',
}: SegmentedToggleProps<T>) {
  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  )
  const currentItem = items[currentIndex] ?? items[0]
  const knobWidth = `calc((100% - 0.25rem) / ${Math.max(items.length, 1)})`

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative isolate inline-grid grid-flow-col auto-cols-fr items-center rounded-full border border-slate-200/80 bg-white/85 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 dark:ring-slate-700/60 dark:shadow-none',
        sizeStyles[size].container,
        className
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0.5 top-0.5 z-[1] rounded-full border border-slate-200/90 bg-white shadow-sm transition-transform duration-300 ease-out dark:border-slate-600 dark:bg-slate-700 dark:shadow-none',
          sizeStyles[size].button,
          currentItem?.knobClassName
        )}
        style={{
          width: knobWidth,
          transform: `translateX(${currentIndex * 100}%)`,
        }}
      />

      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="radio"
          aria-checked={value === item.value}
          aria-label={item.ariaLabel}
          className={cn(
            'group relative z-10 inline-flex items-center justify-center rounded-full font-medium tracking-tight transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600',
            sizeStyles[size].button,
            value === item.value
              ? item.activeTextClassName ?? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
            buttonClassName
          )}
          onClick={() => onValueChange(item.value)}
        >
          {item.tooltip ? (
            <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
              {item.tooltip}
              <span className="absolute left-1/2 top-full -translate-x-1/2">
                <span className="block h-2 w-2 -translate-y-1 rotate-45 rounded-[2px] bg-slate-950/90 ring-1 ring-white/10" />
              </span>
            </span>
          ) : null}

          {item.content}
        </button>
      ))}
    </div>
  )
}
