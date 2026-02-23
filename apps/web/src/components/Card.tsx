import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  const baseClassName =
    'rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur'
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName

  return <div className={mergedClassName}>{children}</div>
}

