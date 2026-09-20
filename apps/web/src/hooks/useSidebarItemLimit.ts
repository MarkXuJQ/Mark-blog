import { useMediaQuery } from './useMediaQuery'

interface SidebarItemLimitOptions {
  maxItems?: number
  shortViewportItems?: number
  mediumViewportItems?: number
}

export function useSidebarItemLimit({
  maxItems = 5,
  shortViewportItems = 3,
  mediumViewportItems = 4,
}: SidebarItemLimitOptions = {}) {
  const isShortViewport = useMediaQuery('(max-height: 760px)')
  const isMediumViewport = useMediaQuery('(max-height: 900px)')

  if (isShortViewport) return Math.min(maxItems, shortViewportItems)
  if (isMediumViewport) return Math.min(maxItems, mediumViewportItems)
  return maxItems
}
