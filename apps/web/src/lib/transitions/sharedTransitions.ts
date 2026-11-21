// Shared spring used by the hero title reveal in both the section and the
// animated name component, so their motion stays in sync.
export const HERO_TITLE_REVEAL_TRANSITION = {
  type: 'spring',
  stiffness: 165,
  damping: 19,
} as const
