import type { ReactNode } from 'react'
import { cn } from '@/lib/classNames'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'

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
  const itemCount = Math.max(items.length, 1)
  const knobWidth = `calc(${100 / itemCount}% - ${0.25 / itemCount}rem)`

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative isolate inline-grid auto-cols-fr grid-flow-col items-center rounded-full border border-slate-200/80 bg-white/85 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-md dark:border-[#2b2f36] dark:bg-[#17191c] dark:shadow-none dark:ring-[#2b2f36]/70',
        sizeStyles[size].container,
        className
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0.5 left-0.5 z-[1] rounded-full border border-slate-200/90 bg-white shadow-sm transition-transform duration-300 ease-out dark:border-[#2b2f36] dark:bg-[#23262c] dark:shadow-none',
          sizeStyles[size].button,
          currentItem?.knobClassName
        )}
        style={{
          width: knobWidth,
          transform: `translateX(${currentIndex * 100}%)`,
        }}
      />

      <TooltipProvider delayDuration={120}>
        {items.map((item) => {
          const button = (
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
                  ? (item.activeTextClassName ??
                      'text-slate-900 dark:text-slate-100')
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                buttonClassName
              )}
              onClick={() => onValueChange(item.value)}
            >
              {item.content}
            </button>
          )

          if (!item.tooltip) return button

          return (
            <Tooltip key={item.value}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="top" showArrow className="text-xs">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
}
