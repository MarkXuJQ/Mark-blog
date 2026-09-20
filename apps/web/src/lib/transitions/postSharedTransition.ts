export type PostSharedElement = 'cover' | 'title' | 'meta'

export const POST_SHARED_LAYOUT_GROUP_ID = 'site-page-layout'
export const POST_SHARED_TRANSITION_DURATION_MS = 360
export const POST_SHARED_TRANSITION_SETTLE_MS = 520

export const postSharedTransition = {
  layout: {
    type: 'tween',
    duration: POST_SHARED_TRANSITION_DURATION_MS / 1000,
    ease: [0.16, 1, 0.3, 1],
  },
} as const

export function getPostSharedLayoutId(
  slug: string,
  element: PostSharedElement
) {
  return `blog-post-${element}-${slug}`
}

export function getPostSharedTransitionIds(
  slug: string | undefined,
  enabled: boolean
) {
  return {
    coverLayoutId:
      enabled && slug ? getPostSharedLayoutId(slug, 'cover') : undefined,
    titleLayoutId:
      enabled && slug ? getPostSharedLayoutId(slug, 'title') : undefined,
    metaLayoutId:
      enabled && slug ? getPostSharedLayoutId(slug, 'meta') : undefined,
  }
}
