import { useEffect, type RefObject } from 'react'

/**
 * Body rows above this get a collapse control. Below it a table is short
 * enough to read in full, so we leave the markup completely untouched.
 */
const COLLAPSE_ROW_THRESHOLD = 10

let tableFrameId = 0

export interface TableBlockEnhancementLabels {
  collapse: string
  expand: string
}

function updateToggleButton(
  button: HTMLButtonElement,
  isExpanded: boolean,
  labels: TableBlockEnhancementLabels
) {
  const label = isExpanded ? labels.collapse : labels.expand
  button.textContent = label
  button.setAttribute('aria-expanded', String(isExpanded))
  button.setAttribute('aria-label', label)
  button.title = label
  button.dataset.state = isExpanded ? 'expanded' : 'collapsed'
}

/**
 * Long tables render fully expanded by default — no fixed-height inner
 * scrolling region. Tables above the row threshold get a single toggle below
 * the table that folds them down to a readable preview and back.
 */
export function useArticleTableEnhancements(
  containerRef: RefObject<HTMLElement | null>,
  labels: TableBlockEnhancementLabels,
  contentKey?: string
) {
  const { collapse, expand } = labels

  useEffect(() => {
    if (window.__PRERENDER__) return

    let raf = 0
    let attempt = 0
    const maxAttempts = 8
    const timeouts: number[] = []
    let observer: MutationObserver | undefined
    const activeLabels = { collapse, expand }

    const enhance = () => {
      const container = containerRef.current
      if (!container) return false

      const frames = Array.from(container.querySelectorAll('.md-table-frame'))
      if (frames.length === 0) return false

      frames.forEach((frame) => {
        if (!(frame instanceof HTMLElement)) return
        // Already handled — the wrapper is the marker.
        if (frame.closest('.md-table-block')) return

        const table = frame.querySelector('table')
        if (!table) return

        const rowCount = table.querySelectorAll('tbody > tr').length
        if (rowCount <= COLLAPSE_ROW_THRESHOLD) return

        const block = document.createElement('div')
        block.className = 'md-table-block not-prose is-collapsible'

        const frameId = `md-table-body-${++tableFrameId}`
        frame.id = frameId
        frame.classList.add('is-collapsible')

        const footer = document.createElement('div')
        footer.className = 'md-table-footer'

        const toggle = document.createElement('button')
        toggle.type = 'button'
        toggle.className = 'md-table-toggle'
        toggle.setAttribute('aria-controls', frameId)
        updateToggleButton(toggle, true, activeLabels)

        footer.append(toggle)

        frame.replaceWith(block)
        block.append(frame, footer)

        const handleToggle = () => {
          const wasCollapsed = block.classList.contains('is-collapsed')
          const nextExpanded = wasCollapsed

          // Collapsing lifts everything below the table, so anchoring the
          // clicked control keeps it under the pointer. Expanding leaves the
          // scroll position alone on purpose: the reader stays on the table's
          // first rows instead of being thrown to the bottom of a long table.
          const toggleRect = nextExpanded
            ? null
            : toggle.getBoundingClientRect()

          block.classList.toggle('is-collapsed', !nextExpanded)
          updateToggleButton(toggle, nextExpanded, activeLabels)

          if (!toggleRect) return
          const toggleTop = toggleRect.top
          if (toggleTop >= window.innerHeight || toggleRect.bottom <= 0) {
            return
          }
          const nextTop = toggle.getBoundingClientRect().top
          const shift = nextTop - toggleTop
          if (Math.abs(shift) > 1) {
            window.scrollBy(0, shift)
          }
        }

        toggle.addEventListener('click', handleToggle)
      })

      return true
    }

    const scheduleEnhance = () => {
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const didEnhance = enhance()
        attempt += 1
        if (!didEnhance && attempt < maxAttempts) {
          timeouts.push(window.setTimeout(scheduleEnhance, 50))
        }
      })
    }

    scheduleEnhance()
    if (containerRef.current) {
      observer = new MutationObserver(() => {
        attempt = 0
        if (!raf) scheduleEnhance()
      })
      observer.observe(containerRef.current, {
        childList: true,
      })
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      observer?.disconnect()
    }
  }, [containerRef, contentKey, collapse, expand])
}
