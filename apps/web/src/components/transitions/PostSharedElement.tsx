import { SharedTransitionFrame } from './SharedTransitionFrame'
import {
  getPostSharedLayoutId,
  type PostSharedElement as PostSharedElementType,
} from '@/lib/transitions/postSharedTransition'

interface PostSharedElementProps {
  slug?: string
  element: PostSharedElementType
  enabled?: boolean
  className?: string
  children: React.ReactNode
}

export function PostSharedElement({
  slug,
  element,
  enabled = false,
  className,
  children,
}: PostSharedElementProps) {
  const layoutId =
    enabled && slug ? getPostSharedLayoutId(slug, element) : undefined

  return (
    <SharedTransitionFrame layoutId={layoutId} className={className}>
      {children}
    </SharedTransitionFrame>
  )
}
