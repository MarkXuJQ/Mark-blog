import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/classNames'
import { DropdownContext, useDropdown } from '@/hooks/useDropdown'

export function Dropdown({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  return (
    <DropdownContext.Provider
      value={{ isOpen, setIsOpen, toggle: () => setIsOpen(!isOpen) }}
    >
      <div
        ref={dropdownRef}
        className={cn('relative', isOpen && 'z-50', className)}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownTrigger({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useDropdown()

  return (
    <button
      onClick={(event) => {
        toggle()
        onClick?.(event)
      }}
      className={className}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownContent({
  children,
  className,
  align = 'end',
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
}) {
  const { isOpen } = useDropdown()

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'animate-in fade-in zoom-in-95 absolute top-full z-10 mt-2 max-w-[calc(100vw-2rem)] min-w-[8rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 duration-150 dark:border-[#2b2f36] dark:bg-[#17191c] dark:ring-white/10',
        align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownItem({
  children,
  className,
  onClick,
  asChild = false,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  asChild?: boolean
}) {
  const { setIsOpen } = useDropdown()

  const handleSelect = () => {
    setIsOpen(false)
    onClick?.()
  }

  const props = asChild
    ? {}
    : {
        role: 'menuitem',
        tabIndex: 0,
        onClick: handleSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect()
          }
        },
        className: cn(
          'relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-[#23262c] dark:focus:bg-[#23262c]',
          className
        ),
      }

  if (asChild) {
    return React.Children.map(children, (child) => {
      if (
        React.isValidElement<{ onClick?: (e?: React.MouseEvent) => void }>(
          child
        )
      ) {
        return React.cloneElement(child, {
          onClick: (e?: React.MouseEvent) => {
            handleSelect()
            child.props.onClick?.(e)
          },
        })
      }
      return child
    })
  }

  return <div {...props}>{children}</div>
}
