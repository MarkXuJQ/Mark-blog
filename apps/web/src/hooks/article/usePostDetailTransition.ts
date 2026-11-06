import { useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { getBlogNavigationState } from '@/lib/blog/blogNavigation'

export function usePostDetailTransition(slug: string | undefined) {
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()
  const navigationState = getBlogNavigationState(location.state)
  const isSharedTransitionEnabled = Boolean(
    navigationState.fromBlogList && navigationState.transitionPostSlug === slug
  )

  return {
    navigationState,
    isSharedTransitionEnabled:
      isSharedTransitionEnabled && prefersReducedMotion !== true,
  }
}
