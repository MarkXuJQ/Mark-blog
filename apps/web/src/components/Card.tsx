import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  const baseClassName =
    'rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80'
  const mergedClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName

  return <div className={mergedClassName}>{children}</div>
}
