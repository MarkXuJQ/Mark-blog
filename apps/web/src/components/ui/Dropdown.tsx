import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'

interface DropdownContextType {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggle: () => void
}

const DropdownContext = createContext<DropdownContextType | undefined>(
  undefined
)

export function useDropdown() {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('useDropdown must be used within a Dropdown')
  }
  return context
}

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
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <DropdownContext.Provider
      value={{ isOpen, setIsOpen, toggle: () => setIsOpen(!isOpen) }}
    >
      <div ref={dropdownRef} className={cn('relative', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownTrigger({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const { toggle } = useDropdown()

  return (
    <button
      onClick={() => {
        toggle()
        onClick?.()
      }}
      className={className}
      type="button"
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute top-full z-50 mt-2 min-w-[8rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10',
            align === 'end'
              ? 'right-0 origin-top-right'
              : 'left-0 origin-top-left',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
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
          'relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800',
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
