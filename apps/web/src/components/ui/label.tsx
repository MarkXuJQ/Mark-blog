'use client'

/* eslint-disable jsx-a11y/label-has-associated-control */

import * as React from 'react'

import { cn } from '@/lib/classNames'

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm leading-4 font-medium text-[var(--text-primary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
