import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur transition-colors duration-300 sm:p-6 dark:border-[#2b2f36] dark:bg-[#17191c]',
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'
