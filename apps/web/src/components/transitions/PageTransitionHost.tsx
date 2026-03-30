import { lazy, Suspense, useEffect, useState } from 'react'
import {
  getPendingPageTransition,
  subscribePageTransition,
} from './pageTransitionBus'

const LazyPageTransitionOverlay = lazy(() =>
  import('./PageTransitionOverlay').then((module) => ({
    default: module.PageTransitionOverlay,
  }))
)

export function PageTransitionHost({
  onActiveChange,
}: {
  onActiveChange?: (active: boolean) => void
}) {
  const [shouldMount, setShouldMount] = useState(
    () => getPendingPageTransition() !== null
  )

  useEffect(() => {
    return subscribePageTransition(() => {
      setShouldMount(true)
    })
  }, [])

  if (!shouldMount) return null

  return (
    <Suspense fallback={null}>
      <LazyPageTransitionOverlay onActiveChange={onActiveChange} />
    </Suspense>
  )
}
