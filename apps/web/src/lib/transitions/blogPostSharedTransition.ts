export type BlogPostSharedElement = 'cover' | 'title' | 'meta'

export const BLOG_POST_SHARED_LAYOUT_GROUP_ID = 'site-page-layout'
export const BLOG_POST_SHARED_TRANSITION_DURATION_MS = 360
export const BLOG_POST_SHARED_TRANSITION_SETTLE_MS = 520

export const blogPostSharedTransition = {
  layout: {
    type: 'tween',
    duration: BLOG_POST_SHARED_TRANSITION_DURATION_MS / 1000,
    ease: [0.16, 1, 0.3, 1],
  },
} as const

export function getBlogPostSharedLayoutId(
  slug: string,
  element: BlogPostSharedElement
) {
  return `blog-post-${element}-${slug}`
}

export function getBlogPostSharedTransitionIds(
  slug: string | undefined,
  enabled: boolean
) {
  return {
    coverLayoutId:
      enabled && slug ? getBlogPostSharedLayoutId(slug, 'cover') : undefined,
    titleLayoutId:
      enabled && slug ? getBlogPostSharedLayoutId(slug, 'title') : undefined,
    metaLayoutId:
      enabled && slug ? getBlogPostSharedLayoutId(slug, 'meta') : undefined,
  }
}
