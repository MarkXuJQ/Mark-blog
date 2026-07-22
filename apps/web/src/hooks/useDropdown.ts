import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface DropdownContextValue {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  toggle: () => void
}

export const DropdownContext = createContext<DropdownContextValue | undefined>(
  undefined
)

export function useDropdown() {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('useDropdown must be used within a Dropdown')
  }
  return context
}
