'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showArrow?: boolean
  }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 relative z-50 max-w-[280px] rounded-lg border px-3 py-1.5 text-sm shadow-sm backdrop-blur',
        className
      )}
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor:
          'color-mix(in srgb, var(--surface-0) 92%, transparent)',
        color: 'var(--text-primary)',
        ...props.style,
      }}
      {...props}
    >
      {props.children}
      {showArrow && (
        <TooltipPrimitive.Arrow
          className="-my-px drop-shadow-[0_1px_0_rgba(15,23,42,0.08)]"
          style={{ fill: 'var(--surface-0)' }}
        />
      )}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
