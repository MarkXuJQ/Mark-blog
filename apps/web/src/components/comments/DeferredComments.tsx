import { Comments } from './Comments'

interface DeferredCommentsProps {
  rootMargin?: string
  containerId?: string
  path?: string
  eager?: boolean
  layout?: 'auto' | 'stacked'
  onCommentLoaded?: () => void
}

export function DeferredComments({
  containerId,
  path,
  eager,
  layout,
  onCommentLoaded,
}: DeferredCommentsProps) {
  return (
    <Comments
      containerId={containerId || 'twikoo'}
      path={path}
      eager={eager}
      layout={layout}
      onCommentLoaded={onCommentLoaded}
    />
  )
}
