import { createContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

type FloatingControlsContextValue = {
  setHasMobileBlogDrawerTrigger: Dispatch<SetStateAction<boolean>>
}

export const FloatingControlsContext =
  createContext<FloatingControlsContextValue>({
    setHasMobileBlogDrawerTrigger: () => undefined,
  })
