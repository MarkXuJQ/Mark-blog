import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  deleteLocalLine,
  loadAnnotationGroups,
  type AnnotationGroup,
  type TextAnchor,
} from '@/lib/comments/textAnnotations'
import {
  deleteTwikooComment,
  TWIKOO_COMMENTS_CHANGED_EVENT,
} from '@/lib/comments/twikooLoader'

export type ComposerMode = 'detail' | 'quick'

interface AnnotationContextValue {
  commentPath: string
  /** Selection currently being commented on; also drives the sidebar panel. */
  draft: TextAnchor | null
  /** Keeps the panel mounted for its exit animation before it unmounts. */
  closing: boolean
  composerMode: ComposerMode
  openComposer: (anchor: TextAnchor, mode?: ComposerMode) => void
  closeComposer: () => void
  /** Called by the panel when its exit animation has finished. */
  finishClose: () => void
  groups: AnnotationGroup[]
  refresh: () => void
  /** Show a freshly drawn line before the backend fetch resolves. */
  addLocalLine: (anchor: TextAnchor) => void
  /** Called after the side-panel composer posts to Twikoo. */
  onSaved: () => void
  /** Remove a locally drawn line (no comment attached). */
  deleteLine: (id: string) => void
  /** Remove one's own Twikoo comment and refresh both comment views. */
  deleteComment: (id: string) => Promise<void>
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null)

export function useAnnotations(): AnnotationContextValue {
  const value = useContext(AnnotationContext)
  if (!value) throw new Error('useAnnotations must be used inside AnnotationProvider')
  return value
}

export function AnnotationProvider({
  commentPath,
  children,
}: {
  commentPath: string
  children: ReactNode
}) {
  const [draft, setDraft] = useState<TextAnchor | null>(null)
  const [closing, setClosing] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const closingRef = useRef(false)
  const [composerMode, setComposerMode] = useState<ComposerMode>('detail')
  const [groups, setGroups] = useState<AnnotationGroup[]>([])
  const groupsVersionRef = useRef(0)

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  useEffect(() => clearCloseTimer, [clearCloseTimer])

  const unmountComposer = useCallback(() => {
    if (!closingRef.current) return
    clearCloseTimer()
    setDraft(null)
    setClosing(false)
    closingRef.current = false
  }, [clearCloseTimer])

  const reload = useCallback(() => {
    const version = ++groupsVersionRef.current
    void loadAnnotationGroups(commentPath).then((next) => {
      if (version === groupsVersionRef.current) setGroups(next)
    })
  }, [commentPath])

  const refresh = useCallback(() => {
    const version = ++groupsVersionRef.current
    void loadAnnotationGroups(commentPath).then((next) => {
      if (version === groupsVersionRef.current) setGroups(next)
    })
    return () => {
      if (version === groupsVersionRef.current) groupsVersionRef.current += 1
    }
  }, [commentPath])

  useEffect(() => {
    const stop = refresh()
    return stop
  }, [refresh])

  useEffect(() => {
    // Bottom Twikoo deletions/refreshes change its DOM; reload the side panel
    // and article marks without touching the widget (no second Twikoo init).
    const syncFromBottom = () => reload()
    window.addEventListener(TWIKOO_COMMENTS_CHANGED_EVENT, syncFromBottom)
    return () =>
      window.removeEventListener(TWIKOO_COMMENTS_CHANGED_EVENT, syncFromBottom)
  }, [reload])

  const addLocalLine = useCallback((anchor: TextAnchor) => {
    groupsVersionRef.current += 1
    setGroups((prev) =>
      prev.some((group) => group.anchor.id === anchor.id)
        ? prev
        : [...prev, { anchor, comments: [] }]
    )
  }, [])

  const openComposer = useCallback(
    (anchor: TextAnchor, mode: ComposerMode = 'detail') => {
      clearCloseTimer()
      closingRef.current = false
      setClosing(false)
      setDraft(anchor)
      setComposerMode(mode)
    },
    [clearCloseTimer]
  )
  const closeComposer = useCallback(() => {
    clearCloseTimer()
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
    closingRef.current = true
    setClosing(true)
    if (reduceMotion) {
      unmountComposer()
      return
    }
    // Safety net for browsers that never fire animationend.
    closeTimerRef.current = window.setTimeout(unmountComposer, 1200)
  }, [clearCloseTimer, unmountComposer])

  const refreshBottomWidget = useCallback(() => {
    document
      .querySelector<HTMLElement>(
        '#twikoo-container [data-twikoo-action="refresh"]'
      )
      ?.click()
  }, [])

  const onSaved = useCallback(() => {
    // Keep the composer open after a successful post so the new comment is
    // visible in place; only the draft text is cleared by the composer.
    reload()
    // The side composer posts straight to Twikoo, so ask the still-mounted
    // bottom widget to reload — both comment views stay in sync.
    refreshBottomWidget()
  }, [reload, refreshBottomWidget])

  const deleteLine = useCallback(
    (id: string) => {
      deleteLocalLine(commentPath, id)
      groupsVersionRef.current += 1
      setGroups((prev) =>
        prev.flatMap((group) =>
          group.anchor.id === id && group.comments.length === 0 ? [] : [group]
        )
      )
      if (draft?.id === id) closeComposer()
      reload()
    },
    [closeComposer, commentPath, draft?.id, reload]
  )

  const deleteComment = useCallback(
    async (id: string) => {
      await deleteTwikooComment(id)
      groupsVersionRef.current += 1
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          comments: group.comments.filter((comment) => comment.id !== id),
        }))
      )
      if (draft?.id === id) closeComposer()
      reload()
      refreshBottomWidget()
    },
    [closeComposer, draft?.id, reload, refreshBottomWidget]
  )

  const value = useMemo(
    () => ({
      commentPath,
      draft,
      closing,
      composerMode,
      openComposer,
      closeComposer,
      finishClose: unmountComposer,
      groups,
      refresh,
      addLocalLine,
      onSaved,
      deleteLine,
      deleteComment,
    }),
    [
      commentPath,
      draft,
      closing,
      composerMode,
      openComposer,
      closeComposer,
      unmountComposer,
      groups,
      refresh,
      addLocalLine,
      onSaved,
      deleteLine,
      deleteComment,
    ]
  )

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>
}
