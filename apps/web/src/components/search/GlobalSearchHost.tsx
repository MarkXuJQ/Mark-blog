import { lazy, Suspense, useEffect, useState } from 'react'
import {
  getGlobalSearchState,
  openGlobalSearch,
  subscribeGlobalSearch,
} from './globalSearchBus'

const LazyGlobalSearchModal = lazy(() =>
  import('./GlobalSearchModal').then((module) => ({
    default: module.GlobalSearchModal,
  }))
)

export function GlobalSearchHost({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  const [shouldMount, setShouldMount] = useState(() => getGlobalSearchState().open)

  useEffect(() => {
    return subscribeGlobalSearch((state) => {
      if (state.open) {
        setShouldMount(true)
      }
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isShortcut = (event.ctrlKey || event.metaKey) && key === 'k'

      if (!isShortcut) return

      event.preventDefault()
      setShouldMount(true)
      openGlobalSearch()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!shouldMount) return null

  return (
    <Suspense fallback={null}>
      <LazyGlobalSearchModal onOpenChange={onOpenChange} />
    </Suspense>
  )
}
