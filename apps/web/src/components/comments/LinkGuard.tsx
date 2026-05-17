import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { CornerUpLeft, ExternalLink } from 'lucide-react'

interface LinkGuardProps {
  /**
   * The container element to monitor for link clicks.
   * Only links within this container will be intercepted.
   */
  containerRef: RefObject<HTMLElement | null>
}

type PopoverPosition = {
  left: number
  top: number
}

const POPOVER_WIDTH = 360
const POPOVER_GUTTER = 12
const POPOVER_OFFSET = 10

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getPopoverPosition(anchor: HTMLElement): PopoverPosition {
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - POPOVER_GUTTER * 2)
  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    POPOVER_GUTTER,
    window.innerWidth - width - POPOVER_GUTTER
  )
  const topCandidate = rect.top - POPOVER_OFFSET
  const top =
    topCandidate > 72
      ? topCandidate
      : Math.min(
          rect.bottom + POPOVER_OFFSET + 48,
          window.innerHeight - POPOVER_GUTTER
        )

  return { left, top }
}

export function LinkGuard({ containerRef }: LinkGuardProps) {
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [popoverJumpTo, setPopoverJumpTo] = useState('')
  const [popoverInput, setPopoverInput] = useState('')
  const [showUndo, setShowUndo] = useState(false)
  const [referenceElement, setReferenceElement] =
    useState<HTMLElement | null>(null)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return

      // Skip avatar clicks if needed (specific to Twikoo or generic comments).
      if (e.target.matches('.tk-avatar-img')) {
        e.stopPropagation()
        return
      }

      const targetLink = e.target.closest('a[target="_blank"]')
      if (!(targetLink instanceof HTMLAnchorElement)) return

      // Only intercept links inside the monitored container.
      if (!containerRef.current?.contains(targetLink)) return

      e.preventDefault()
      e.stopPropagation()

      const decodedHref = decodeURIComponent(targetLink.href)

      setPopoverJumpTo(decodedHref)
      setPopoverInput(decodedHref)
      setReferenceElement(targetLink)
      setPosition(getPopoverPosition(targetLink))
      setPopoverVisible(true)
      setShowUndo(false)
    }

    const containerEl = containerRef.current
    if (containerEl) {
      containerEl.addEventListener('click', handleLinkClick, { capture: true })
    }

    return () => {
      if (containerEl) {
        containerEl.removeEventListener('click', handleLinkClick, {
          capture: true,
        })
      }
    }
  }, [containerRef])

  useEffect(() => {
    if (!popoverVisible || !referenceElement) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (popoverRef.current?.contains(target)) return
      if (referenceElement.contains(target)) return
      setPopoverVisible(false)
    }

    const updatePosition = () => {
      if (!document.contains(referenceElement)) {
        setPopoverVisible(false)
        return
      }
      setPosition(getPopoverPosition(referenceElement))
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [popoverVisible, referenceElement])

  const handleInputChange = (e: FormEvent<HTMLSpanElement>) => {
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
      window.open(popoverInput, '_blank', 'noopener,noreferrer')
      setPopoverVisible(false)
    }
  }

  if (!referenceElement || !popoverVisible || !position) return null

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[160] flex -translate-y-full items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-200 dark:border-slate-700 dark:bg-slate-800"
      style={{
        left: position.left,
        top: position.top,
        width: `min(${POPOVER_WIDTH}px, calc(100vw - ${POPOVER_GUTTER * 2}px))`,
      }}
      role="dialog"
      aria-label="Confirm external link"
    >
      <span
        id="link-guard-input"
        role="textbox"
        tabIndex={0}
        aria-label="Edit link"
        key={popoverJumpTo}
        className="min-w-0 flex-1 break-all px-3 py-1.5 font-mono text-sm text-slate-600 outline-none dark:text-slate-300"
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck={false}
        onInput={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirmOpen()
          }

          if (e.key === 'Escape') {
            e.preventDefault()
            setPopoverVisible(false)
          }
        }}
      >
        {popoverJumpTo}
      </span>

      {showUndo ? (
        <button
          type="button"
          className="border-l border-slate-100 px-2 text-slate-400 transition-colors hover:text-slate-600 dark:border-slate-700 dark:hover:text-slate-200"
          onClick={handleUndo}
          title="Reset link"
        >
          <CornerUpLeft size={16} />
        </button>
      ) : null}

      <button
        type="button"
        className="flex items-center gap-1 rounded-r bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700"
        onClick={confirmOpen}
      >
        <span>Open</span>
        <ExternalLink size={12} />
      </button>
    </div>,
    document.body
  )
}
