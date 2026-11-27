import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { FiEdit, FiMessageSquare, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAnnotations } from './AnnotationProvider'
import {
  anchorFromSelection,
  renderAnnotationMarks,
  saveLocalLine,
  syncInlineChips,
  type TextAnchor,
} from '@/lib/comments/textAnnotations'

type Bubble = { anchor: TextAnchor; x: number; y: number; above: boolean; arrow: number }
type Viewer = { id: string; x: number; y: number; above: boolean; arrow: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isMobileLayout() {
  return window.innerWidth < 1024
}

function place(rect: DOMRect, preferredWidth: number, preferBelow = false) {
  const width = Math.min(preferredWidth, window.innerWidth - 24)
  const height = preferredWidth <= 132 ? 66 : 112
  const center = rect.left + rect.width / 2
  const x = clamp(center, width / 2 + 12, window.innerWidth - width / 2 - 12)
  // Keep the arrow over the selected text even when the bubble is clamped.
  const arrow = clamp(center - (x - width / 2), 20, width - 20)
  // Phones show their own toolbar above the text, so hang below it.
  const above = !preferBelow && rect.top > 190
  const y = above
    ? clamp(rect.top - 14, height + 12, window.innerHeight - 12)
    : clamp(rect.bottom + 14, 12, window.innerHeight - height - 12)
  return { x, arrow, y, above }
}

/** Draws the bubbles; marks and chips are plain DOM inside the article. */
export function ArticleAnnotationLayer({
  contentRef,
  refreshKey,
}: {
  contentRef: RefObject<HTMLDivElement | null>
  refreshKey: string
}) {
  const { t } = useTranslation()
  const {
    commentPath,
    openComposer,
    closeComposer,
    groups,
    refresh,
    addLocalLine,
    deleteLine,
  } = useAnnotations()
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const groupsRef = useRef(groups)
  groupsRef.current = groups

  // Reconcile marks and chips in place so a state update never rewrites the
  // whole article DOM (content switch, reader mode, search highlighting).
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    renderAnnotationMarks(root, groups)
    // The chip is a shortcut to posted comments, not to an empty draft.
    syncInlineChips(
      root,
      groups.filter((group) => group.comments.length).map((group) => group.anchor)
    )
  }, [contentRef, groups, refreshKey])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    let touchTimer: number | undefined
    let selectionTimer: number | undefined
    let longPressed = false
    let pointerDown = false

    const readSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setBubble(null)
        return
      }
      const range = selection.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) {
        setBubble(null)
        return
      }
      const anchor = anchorFromSelection(root, selection)
      if (!anchor) {
        setBubble(null)
        return
      }
      const rect = range.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      setBubble({
        anchor,
        ...place(rect, 132, isMobileLayout()),
      })
      setViewer(null)
    }

    const scheduleRead = (delay: number) => {
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
      selectionTimer = window.setTimeout(readSelection, delay)
    }

    // selectionchange also covers keyboard and double-click selections.
    const onSelectionChange = () => {
      if (pointerDown) return
      scheduleRead(120)
    }
    const onMouseDown = () => {
      pointerDown = true
    }
    const onMouseUp = (event: MouseEvent) => {
      pointerDown = false
      const target = event.target as Element | null
      if (
        target?.closest?.(
          '.annotation-bubble, .annotation-mark, .annotation-inline-chip'
        )
      ) {
        return
      }
      scheduleRead(0)
    }
    const onTouchStart = (event: TouchEvent) => {
      longPressed = false
      const touch = event.touches[0]
      if (!touch) return
      touchTimer = window.setTimeout(() => {
        longPressed = true
        readSelection()
      }, 500)
      void touch
    }
    const onTouchMove = () => {
      if (touchTimer !== undefined) window.clearTimeout(touchTimer)
    }
    const onTouchEnd = () => {
      pointerDown = false
      if (touchTimer !== undefined) window.clearTimeout(touchTimer)
      if (!longPressed) setBubble(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBubble(null)
        setViewer(null)
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
      const target = event.target as Element | null
      if (
        target?.closest?.(
          '.annotation-bubble, .annotation-mark, .annotation-inline-chip'
        )
      ) {
        return
      }
      setBubble(null)
      setViewer(null)
    }
    const onScroll = () => {
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
      setBubble(null)
      setViewer(null)
    }

    const onPointerUp = () => {
      pointerDown = false
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('keydown', onKeyDown)
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: true })
    root.addEventListener('touchend', onTouchEnd)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('keydown', onKeyDown)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('scroll', onScroll)
      if (touchTimer !== undefined) window.clearTimeout(touchTimer)
      if (selectionTimer !== undefined) window.clearTimeout(selectionTimer)
    }
  }, [contentRef])

  // Capture backlinks before LinkGuard so they never open its dialog.
  useEffect(() => {
    const jumpToLine = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a[data-annotation-link]')
      if (!link) return
      event.preventDefault()
      event.stopPropagation()
      const id = link.getAttribute('data-annotation-link') ?? ''
      const mark = document.querySelector<HTMLElement>(
        `.annotation-mark[data-annotation-id="${CSS.escape(id)}"]`
      )
      if (!mark) return
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
      mark.classList.add('is-jumped')
      window.setTimeout(() => mark.classList.remove('is-jumped'), 1600)
    }
    document.addEventListener('click', jumpToLine, true)
    return () => document.removeEventListener('click', jumpToLine, true)
  }, [])

  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      const marker = target?.closest?.(
        '.annotation-mark, .annotation-inline-chip'
      )
      if (!marker) {
        // Clicking ordinary article text leaves the inline composer.
        closeComposer()
        return
      }
      const id = (marker.getAttribute('data-annotation-ids') ??
        marker.getAttribute('data-annotation-id') ?? '')
        .split(',')[0]
      if (!id) return
      const found = groupsRef.current.find((item) => item.anchor.id === id)
      const isChip = marker.classList.contains('annotation-inline-chip')
      if (found && (isChip || window.innerWidth < 1024)) {
        // The little SVG chip is a direct shortcut into the comment panel; on a
        // phone the dashed mark works the same way instead of showing the
        // compact desktop viewer bubble.
        setBubble(null)
        setViewer(null)
        openComposer(found.anchor, 'detail')
        return
      }
      const rect = marker.getBoundingClientRect()
      closeComposer()
      setBubble(null)
      setViewer({ id, ...place(rect, 220) })
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [contentRef, closeComposer, openComposer])

  const group = viewer ? groupsRef.current.find((g) => g.anchor.id === viewer.id) : undefined

  const openFromBubble = (target: TextAnchor) => {
    openComposer(target, isMobileLayout() ? 'quick' : 'detail')
  }

  return createPortal(
    <>
      {bubble ? (
        <div
          role="presentation"
          className="annotation-bubble"
          data-kind="select"
          data-placement={bubble.above ? 'top' : 'bottom'}
          style={
            {
              left: bubble.x,
              top: bubble.y,
              '--annotation-arrow-left': `${bubble.arrow}px`,
            } as CSSProperties
          }
          onMouseDown={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="annotation-bubble-action"
            aria-label={t('annotation.drawLine', '画线')}
            title={t('annotation.drawLine', '画线')}
            onClick={() => {
              saveLocalLine(commentPath, bubble.anchor)
              addLocalLine(bubble.anchor)
              refresh()
              openFromBubble(bubble.anchor)
              setBubble(null)
              window.getSelection()?.removeAllRanges()
            }}
          >
            <FiEdit aria-hidden="true" />
            <span>{t('annotation.drawLine', '画线')}</span>
          </button>
          <button
            type="button"
            className="annotation-bubble-action"
            aria-label={t('annotation.comment', '评论')}
            title={t('annotation.comment', '评论')}
            onClick={() => {
              openFromBubble(bubble.anchor)
              setBubble(null)
              window.getSelection()?.removeAllRanges()
            }}
          >
            <FiMessageSquare aria-hidden="true" />
            <span>{t('annotation.comment', '评论')}</span>
          </button>
        </div>
      ) : null}

      {viewer ? (
        <div
          role="presentation"
          className="annotation-bubble annotation-viewer"
          data-kind="view"
          data-placement={viewer.above ? 'top' : 'bottom'}
          style={
            {
              left: viewer.x,
              top: viewer.y,
              '--annotation-arrow-left': `${viewer.arrow}px`,
            } as CSSProperties
          }
          onMouseDown={(event) => event.stopPropagation()}
        >
          {group ? (
            <>
              <div className="annotation-viewer-actions">
                <button
                  type="button"
                  className="annotation-bubble-action"
                  onClick={() => {
                    openComposer(group.anchor)
                    setViewer(null)
                  }}
                >
                  <FiMessageSquare aria-hidden="true" />
                  {t('annotation.viewComments', '查看评论')}
                </button>
                <button
                  type="button"
                  className="annotation-bubble-action annotation-bubble-danger"
                  onClick={() => {
                    deleteLine(group.anchor.id)
                    setViewer(null)
                  }}
                >
                  <FiTrash2 aria-hidden="true" />
                  {t('annotation.deleteLine', '删除划线')}
                </button>
              </div>
            </>
          ) : (
            <p className="annotation-viewer-empty">
              {t('annotation.missing', '原文已变更，暂时无法定位')}
            </p>
          )}
        </div>
      ) : null}
    </>,
    document.body
  )
}
