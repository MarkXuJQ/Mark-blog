import { useEffect, type RefObject } from 'react'

const DRAG_THRESHOLD = 6
const DRAG_SUPPRESS_MS = 180
const PHOTO_SCROLL_SELECTOR = '.photo-scroll, .photo-scroll-vertical'

function getWheelDelta(event: WheelEvent) {
  const rawDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return rawDelta * 16
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return rawDelta * window.innerWidth
  }

  return rawDelta
}

export function usePhotoScroll(
  containerRef: RefObject<HTMLElement | null>,
  contentKey?: string
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scrollers = Array.from(
      container.querySelectorAll<HTMLElement>(PHOTO_SCROLL_SELECTOR)
    )
    if (scrollers.length === 0) return

    const cleanups = scrollers.map((scroller) => {
      let activePointerId: number | null = null
      let pointerOrigin: EventTarget | null = null
      let startX = 0
      let startY = 0
      let startScrollLeft = 0
      let isDragging = false
      let hasPointerCapture = false
      let suppressTimer = 0

      const setDragged = () => {
        scroller.dataset.photoScrollDragged = 'true'
        if (suppressTimer) {
          window.clearTimeout(suppressTimer)
        }
        suppressTimer = window.setTimeout(() => {
          delete scroller.dataset.photoScrollDragged
          suppressTimer = 0
        }, DRAG_SUPPRESS_MS)
      }

      const endDrag = () => {
        if (activePointerId !== null && hasPointerCapture) {
          try {
            scroller.releasePointerCapture(activePointerId)
          } catch {
            // Pointer capture may already be released by the browser.
          }
        }
        if (isDragging) {
          setDragged()
        }
        activePointerId = null
        pointerOrigin = null
        isDragging = false
        hasPointerCapture = false
        scroller.classList.remove('is-dragging')
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return

        activePointerId = event.pointerId
        pointerOrigin = event.target
        startX = event.clientX
        startY = event.clientY
        startScrollLeft = scroller.scrollLeft
        isDragging = false
        hasPointerCapture = false
      }

      const handlePointerMove = (event: PointerEvent) => {
        if (activePointerId !== event.pointerId) return

        const deltaX = event.clientX - startX
        const deltaY = event.clientY - startY
        if (
          !isDragging &&
          Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD &&
          Math.abs(deltaX) > Math.abs(deltaY)
        ) {
          isDragging = true
          scroller.classList.add('is-dragging')
          scroller.setPointerCapture(event.pointerId)
          hasPointerCapture = true
        }

        if (!isDragging) return

        event.preventDefault()
        scroller.scrollLeft = startScrollLeft - deltaX
      }

      const handlePointerLeave = () => {
        if (activePointerId === null || !isDragging) return
        endDrag()
      }

      const handlePointerUp = (event: PointerEvent) => {
        if (activePointerId !== event.pointerId) return
        endDrag()
      }

      const handlePointerCancel = (event: PointerEvent) => {
        if (activePointerId !== event.pointerId) return
        endDrag()
      }

      const handleWheel = (event: WheelEvent) => {
        if (!event.ctrlKey) return
        const delta = getWheelDelta(event)
        if (delta === 0) return

        if (suppressTimer) {
          window.clearTimeout(suppressTimer)
        }
        delete scroller.dataset.photoScrollDragged
        event.preventDefault()
        event.stopPropagation()
        scroller.scrollLeft += delta
      }

      const handleDragStart = (event: DragEvent) => {
        if (event.target instanceof HTMLImageElement) {
          event.preventDefault()
        }
      }

      const handleClickCapture = (event: MouseEvent) => {
        if (!isDragging && !scroller.dataset.photoScrollDragged) return

        event.preventDefault()
        event.stopPropagation()
        if (pointerOrigin instanceof HTMLElement) {
          pointerOrigin.blur()
        }
      }

      scroller.querySelectorAll('img').forEach((img) => {
        img.draggable = false
      })

      scroller.addEventListener('pointerdown', handlePointerDown)
      scroller.addEventListener('pointermove', handlePointerMove)
      scroller.addEventListener('pointerleave', handlePointerLeave)
      scroller.addEventListener('pointerup', handlePointerUp)
      scroller.addEventListener('pointercancel', handlePointerCancel)
      scroller.addEventListener('dragstart', handleDragStart)
      scroller.addEventListener('click', handleClickCapture, true)
      scroller.addEventListener('wheel', handleWheel, {
        capture: true,
        passive: false,
      })

      return () => {
        scroller.removeEventListener('pointerdown', handlePointerDown)
        scroller.removeEventListener('pointermove', handlePointerMove)
        scroller.removeEventListener('pointerleave', handlePointerLeave)
        scroller.removeEventListener('pointerup', handlePointerUp)
        scroller.removeEventListener('pointercancel', handlePointerCancel)
        scroller.removeEventListener('dragstart', handleDragStart)
        scroller.removeEventListener('click', handleClickCapture, true)
        scroller.removeEventListener('wheel', handleWheel, { capture: true })
        if (suppressTimer) {
          window.clearTimeout(suppressTimer)
        }
        scroller.classList.remove('is-dragging')
        delete scroller.dataset.photoScrollDragged
      }
    })

    const handleWindowWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      if (!(event.target instanceof Element)) return

      const scroller =
        event.target.closest<HTMLElement>(PHOTO_SCROLL_SELECTOR)
      if (!scroller || !container.contains(scroller)) return

      const delta = getWheelDelta(event)
      if (delta === 0) return

      event.preventDefault()
      event.stopPropagation()
      scroller.scrollLeft += delta
    }

    window.addEventListener('wheel', handleWindowWheel, {
      capture: true,
      passive: false,
    })

    return () => {
      window.removeEventListener('wheel', handleWindowWheel, { capture: true })
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [containerRef, contentKey])
}
