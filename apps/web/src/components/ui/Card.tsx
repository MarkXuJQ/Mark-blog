import { forwardRef } from 'react'
import { cn } from '@/lib/classNames'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur transition-colors duration-300 sm:p-6 dark:border-0 dark:bg-[#17191c] dark:shadow-none',
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'
