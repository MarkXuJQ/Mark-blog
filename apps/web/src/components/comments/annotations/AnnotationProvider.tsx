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
import { deleteTwikooComment } from '@/lib/comments/twikooLoader'

export type ComposerMode = 'detail' | 'quick'

export interface ComposerPosition {
  /** Horizontal center for the mobile quick composer. */
  x: number
  /** Selection edge the quick composer should hang from. */
  y: number
  above: boolean
}

interface AnnotationContextValue {
  commentPath: string
  /** Selection currently being commented on; also drives the sidebar panel. */
  draft: TextAnchor | null
  /** Keeps the panel mounted for its exit animation before it unmounts. */
  closing: boolean
  composerMode: ComposerMode
  composerPosition: ComposerPosition | null
  openComposer: (
    anchor: TextAnchor,
    mode?: ComposerMode,
    position?: ComposerPosition | null
  ) => void
  closeComposer: () => void
  /** Called by the panel when its exit animation has finished. */
  finishClose: () => void
  groups: AnnotationGroup[]
  refresh: () => void
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
  const [composerPosition, setComposerPosition] =
    useState<ComposerPosition | null>(null)
  const [groups, setGroups] = useState<AnnotationGroup[]>([])

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
    setComposerPosition(null)
    setClosing(false)
    closingRef.current = false
  }, [clearCloseTimer])

  const reload = useCallback(() => {
    void loadAnnotationGroups(commentPath).then(setGroups)
  }, [commentPath])

  const refresh = useCallback(() => {
    let alive = true
    void loadAnnotationGroups(commentPath).then((next) => {
      if (alive) setGroups(next)
    })
    return () => {
      alive = false
    }
  }, [commentPath])

  useEffect(() => {
    const stop = refresh()
    return stop
  }, [refresh])

  const openComposer = useCallback(
    (
      anchor: TextAnchor,
      mode: ComposerMode = 'detail',
      position: ComposerPosition | null = null
    ) => {
      clearCloseTimer()
      closingRef.current = false
      setClosing(false)
      setDraft(anchor)
      setComposerMode(mode)
      setComposerPosition(position)
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
    // The panel calls finishClose on animationend; this is only a safety net
    // if the browser never fires it (e.g. animations disabled elsewhere).
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
      if (draft?.id === id) closeComposer()
      reload()
    },
    [closeComposer, commentPath, draft?.id, reload]
  )

  const deleteComment = useCallback(
    async (id: string) => {
      await deleteTwikooComment(id)
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
      composerPosition,
      openComposer,
      closeComposer,
      finishClose: unmountComposer,
      groups,
      refresh,
      onSaved,
      deleteLine,
      deleteComment,
    }),
    [
      commentPath,
      draft,
      closing,
      composerMode,
      composerPosition,
      openComposer,
      closeComposer,
      unmountComposer,
      groups,
      refresh,
      onSaved,
      deleteLine,
      deleteComment,
    ]
  )

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>
}
