import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimation } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ReaderModeToggleProps {
  simpleMode: boolean
  onToggle: () => void
}

type DockSide = 'left' | 'right'

const EDGE_GAP = 0
const DEFAULT_TOP_RATIO = 0.5
const STORAGE_KEY = 'blog-reader-mode-toggle-position-v2'
const PORTAL_ROOT_ID = 'reader-mode-toggle-root'
const TOGGLE_MARKER = 'reader-mode-toggle'

type StoredPosition = {
  side?: DockSide
  top?: number
}

export function ReaderModeToggle({
  simpleMode,
  onToggle,
}: ReaderModeToggleProps) {
  const controls = useAnimation()
  const isDraggingRef = useRef(false)
  const sideRef = useRef<DockSide>('left')
  const topRef = useRef(0)
  const [side, setSide] = useState<DockSide>('left')
  const [top, setTop] = useState(0)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (window.__PRERENDER__) return

    document
      .querySelectorAll<HTMLElement>(
        `[data-reader-mode-toggle="${TOGGLE_MARKER}"]`
      )
      .forEach((node) => {
        if (!node.closest(`#${PORTAL_ROOT_ID}`)) {
          node.remove()
        }
      })

    let root = document.getElementById(PORTAL_ROOT_ID)
    if (!root) {
      root = document.createElement('div')
      root.id = PORTAL_ROOT_ID
      document.body.appendChild(root)
    }
    setPortalRoot(root)
  }, [])

  useEffect(() => {
    if (!portalRoot) return

    const saved = readStoredPosition()
    if (saved.side) {
      sideRef.current = saved.side
      setSide(saved.side)
    }

    const syncPosition = () => {
      const nextTop =
        topRef.current ||
        saved.top ||
        Math.round(window.innerHeight * DEFAULT_TOP_RATIO - buttonHeight() / 2)
      const clamped = clampTop(nextTop)
      topRef.current = clamped
      setTop(clamped)
    }

    syncPosition()
    window.addEventListener('resize', syncPosition)
    return () => window.removeEventListener('resize', syncPosition)
  }, [portalRoot])

  const dockTo = (nextSide: DockSide, nextTop: number) => {
    sideRef.current = nextSide
    setSide(nextSide)
    const clampedTop = clampTop(nextTop)
    topRef.current = clampedTop
    setTop(clampedTop)
    writeStoredPosition({ side: nextSide, top: clampedTop })
    void controls.start({
      x: 0,
      y: 0,
      transition: { type: 'spring', stiffness: 420, damping: 32 },
    })
  }

  if (!portalRoot) return null

  return createPortal(
    <motion.div
      drag
      dragMomentum={false}
      animate={controls}
      onDragStart={() => {
        isDraggingRef.current = true
      }}
      onDragEnd={(_, info) => {
        const width = buttonWidth()
        const currentLeft =
          sideRef.current === 'left'
            ? EDGE_GAP + info.offset.x
            : window.innerWidth - width - EDGE_GAP + info.offset.x
        const currentTop = top + info.offset.y
        const centerX = currentLeft + width / 2
        const nextSide = centerX < window.innerWidth / 2 ? 'left' : 'right'
        dockTo(nextSide, currentTop)
        window.setTimeout(() => {
          isDraggingRef.current = false
        }, 80)
      }}
      className={cn(
        'fixed z-[80] hidden lg:block',
        side === 'left' ? 'left-0' : 'right-0'
      )}
      style={{ top }}
      data-reader-mode-toggle={TOGGLE_MARKER}
    >
      <button
        type="button"
        onClick={() => {
          if (!isDraggingRef.current) onToggle()
        }}
        className={cn(
          'flex h-20 w-8 cursor-grab items-center justify-center active:cursor-grabbing',
          'border border-slate-200/70 bg-white/80 px-1 py-2 text-xs font-semibold text-[var(--text-secondary)] shadow-sm backdrop-blur',
          'transition-colors hover:bg-white/90 hover:text-[var(--text-primary)]',
          '[writing-mode:vertical-rl] [text-orientation:mixed]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-400)_72%,transparent)]',
          'dark:border-[#2b2f36] dark:bg-[#17191c] dark:hover:bg-[#1c1a18]',
          side === 'left'
            ? 'rounded-r-md border-l-0'
            : 'rounded-l-md border-r-0'
        )}
        aria-pressed={simpleMode}
        aria-label={simpleMode ? '切换到丰富模式' : '切换到简洁模式'}
        title={simpleMode ? '丰富模式' : '简洁模式'}
      >
        {simpleMode ? '丰富模式' : '简洁模式'}
      </button>
    </motion.div>,
    portalRoot
  )
}

function buttonWidth() {
  return 32
}

function buttonHeight() {
  return 80
}

function clampTop(value: number) {
  if (typeof window === 'undefined') return value
  const min = 88
  const max = Math.max(min, window.innerHeight - buttonHeight() - 24)
  return Math.min(Math.max(value, min), max)
}

function readStoredPosition(): StoredPosition {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredPosition
    return {
      side: parsed.side === 'left' || parsed.side === 'right' ? parsed.side : undefined,
      top: typeof parsed.top === 'number' ? parsed.top : undefined,
    }
  } catch {
    return {}
  }
}

function writeStoredPosition(position: Required<StoredPosition>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  } catch {
    return
  }
}
