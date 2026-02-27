import { useEffect, useState } from 'react'
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css' // optional
import { CornerUpLeft, ExternalLink } from 'lucide-react'

interface LinkGuardProps {
  /**
   * The container element to monitor for link clicks.
   * Only links within this container will be intercepted.
   */
  containerRef: React.RefObject<HTMLElement>
}

export function LinkGuard({ containerRef }: LinkGuardProps) {
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [popoverJumpTo, setPopoverJumpTo] = useState('')
  const [popoverInput, setPopoverInput] = useState('')
  const [showUndo, setShowUndo] = useState(false)
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return

      // Skip avatar clicks if needed (specific to Twikoo or generic comments)
      if (e.target.matches('.tk-avatar-img')) {
        e.stopPropagation()
        return
      }

      const targetLink = e.target.closest('a[target="_blank"]')
      if (!(targetLink instanceof HTMLAnchorElement)) return

      // Only intercept links inside the monitored container
      if (!containerRef.current?.contains(targetLink)) return

      e.preventDefault()
      e.stopPropagation()

      const href = targetLink.href
      const decodedHref = decodeURIComponent(href)
      
      setPopoverJumpTo(decodedHref)
      setPopoverInput(decodedHref)
      setReferenceElement(targetLink)
      setPopoverVisible(true)
      setShowUndo(false)
    }

    const containerEl = containerRef.current
    if (containerEl) {
      containerEl.addEventListener('click', handleLinkClick, { capture: true })
    }

    return () => {
      if (containerEl) {
        containerEl.removeEventListener('click', handleLinkClick, { capture: true })
      }
    }
  }, [containerRef])

  const handleInputChange = (e: React.FormEvent<HTMLSpanElement>) => {
    const newVal = e.currentTarget.textContent || ''
    setPopoverInput(newVal)
    setShowUndo(newVal !== popoverJumpTo)
  }

  const handleUndo = () => {
    setPopoverInput(popoverJumpTo)
    setShowUndo(false)
    const inputEl = document.getElementById('link-guard-input')
    if (inputEl) {
      inputEl.textContent = popoverJumpTo
    }
  }

  const confirmOpen = () => {
    if (popoverInput) {
      window.open(popoverInput, '_blank')
      setPopoverVisible(false)
    }
  }

  if (!referenceElement) return null

  return (
    <Tippy
      visible={popoverVisible}
      onClickOutside={() => setPopoverVisible(false)}
      interactive={true}
      reference={referenceElement}
      placement="top"
      appendTo={document.body}
      render={attrs => (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-1 flex items-stretch overflow-hidden animate-in fade-in zoom-in-95 duration-200" {...attrs}>
          <span
            id="link-guard-input"
            key={popoverJumpTo} // Re-render when target changes to reset content
            className="min-w-[200px] max-w-[300px] px-3 py-1.5 text-sm outline-none break-all text-slate-600 dark:text-slate-300 font-mono"
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            spellCheck={false}
            onInput={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmOpen()
              }
            }}
          >
            {popoverJumpTo}
          </span>

          {showUndo && (
            <button
              className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border-l border-slate-100 dark:border-slate-700"
              onClick={handleUndo}
              title="恢复链接"
            >
              <CornerUpLeft size={16} />
            </button>
          )}

          <button
            className="px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1 rounded-r"
            onClick={confirmOpen}
          >
            <span>访问</span>
            <ExternalLink size={12} />
          </button>
        </div>
      )}
    >
      <span /> 
    </Tippy>
  )
}
