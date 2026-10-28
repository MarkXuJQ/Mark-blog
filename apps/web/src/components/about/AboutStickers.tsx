import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import batmanSticker from '@/assets/home/stickers/batman.webp'
import playstationSticker from '@/assets/home/stickers/playstation-symbols.webp'
import chatGptSticker from '@/assets/home/stickers/think-less-more-chatgpt.webp'

const MIN_SIDE_SPACE = 260
const VIEWPORT_EDGE_INSET = 0.05
const INITIAL_SIDE_MIN = 0.4
const INITIAL_SIDE_MAX = 0.6
const INITIAL_VERTICAL_MIN = 0.2
const INITIAL_VERTICAL_MAX = 0.8

const STICKERS = [
  {
    src: playstationSticker,
    alt: { zh: 'PlayStation 按键符号贴纸', en: 'PlayStation symbols sticker' },
    side: 'left',
    className: 'w-[102px]',
  },
  {
    src: batmanSticker,
    alt: { zh: '蝙蝠侠贴纸', en: 'Batman sticker' },
    side: 'left',
    className: 'w-[300px]',
  },
  {
    src: chatGptSticker,
    alt: {
      zh: 'Think Less More ChatGPT 贴纸',
      en: 'Think Less More ChatGPT sticker',
    },
    side: 'right',
    className: 'w-[330px]',
  },
] as const

export function AboutStickers({
  isZh,
  containerRef,
}: {
  isZh: boolean
  containerRef: RefObject<HTMLElement | null>
}) {
  const isWideDesktop = useMediaQuery('(min-width: 1280px)')
  const [hasSideSpace, setHasSideSpace] = useState(false)
  const safeBoundsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isWideDesktop) {
      setHasSideSpace(false)
      return
    }

    const updateSideSpace = () => {
      const container = containerRef.current
      if (!container) {
        setHasSideSpace(false)
        return
      }

      const bounds = container.getBoundingClientRect()
      const leftSpace = bounds.left
      const rightSpace = window.innerWidth - bounds.right
      setHasSideSpace(
        leftSpace >= MIN_SIDE_SPACE && rightSpace >= MIN_SIDE_SPACE
      )
    }

    updateSideSpace()
    window.addEventListener('resize', updateSideSpace)
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateSideSpace)
    if (observer && containerRef.current) observer.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', updateSideSpace)
      observer?.disconnect()
    }
  }, [containerRef, isWideDesktop])

  if (!isWideDesktop || !hasSideSpace) return null

  return (
    <div
      role="group"
      aria-label={
        isZh
          ? '点击或拖放后会随机旋转的贴纸'
          : 'Stickers that rotate after clicking or dragging'
      }
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
    >
      <div
        ref={safeBoundsRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[5%] -right-[260px] -left-[260px]"
      />
      <div className="pointer-events-none absolute inset-0">
        {STICKERS.map((sticker) => (
          <Sticker
            key={sticker.src}
            sticker={sticker}
            boundsRef={safeBoundsRef}
            containerRef={containerRef}
            isZh={isZh}
          />
        ))}
      </div>
    </div>
  )
}

function Sticker({
  sticker,
  boundsRef,
  containerRef,
  isZh,
}: {
  sticker: (typeof STICKERS)[number]
  boundsRef: RefObject<HTMLDivElement | null>
  containerRef: RefObject<HTMLElement | null>
  isZh: boolean
}) {
  const stickerRef = useRef<HTMLButtonElement>(null)
  const didDrag = useRef(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useMotionValue(0)
  const alt = isZh ? sticker.alt.zh : sticker.alt.en
  const initialSideProgress = useRef(
    randomBetween(INITIAL_SIDE_MIN, INITIAL_SIDE_MAX)
  )
  const initialVerticalProgress = useRef(
    randomBetween(INITIAL_VERTICAL_MIN, INITIAL_VERTICAL_MAX)
  )
  const [initialPosition, setInitialPosition] = useState<{
    left: number
    top: number
  } | null>(null)

  useLayoutEffect(() => {
    const element = stickerRef.current
    const container = containerRef.current
    if (!element || !container || typeof window === 'undefined') return

    const containerBounds = container.getBoundingClientRect()
    const elementWidth = element.getBoundingClientRect().width
    const sideWidth =
      sticker.side === 'left'
        ? containerBounds.left
        : window.innerWidth - containerBounds.right
    if (!elementWidth || sideWidth <= 0 || !containerBounds.height) return

    const targetCenterX =
      sticker.side === 'left'
        ? sideWidth * initialSideProgress.current
        : containerBounds.right + sideWidth * initialSideProgress.current

    setInitialPosition({
      left: targetCenterX - containerBounds.left - elementWidth / 2,
      top: initialVerticalProgress.current * 100,
    })
  }, [containerRef, sticker.side])

  useEffect(() => {
    rotate.set(Math.random() * 30 - 15)
  }, [rotate])

  const moveWithinBounds = useCallback(
    (element: HTMLButtonElement, deltaX = 0, deltaY = 0) => {
      const boundsElement = boundsRef.current
      if (!boundsElement) return

      const bounds = boundsElement.getBoundingClientRect()
      if (!bounds.height || !window.innerWidth) return

      const rect = element.getBoundingClientRect()
      const centerX = (rect.left + rect.right) / 2
      const centerY = (rect.top + rect.bottom) / 2
      const horizontalInset = window.innerWidth * VIEWPORT_EDGE_INSET
      const constrainedX = Math.max(
        horizontalInset - centerX,
        Math.min(deltaX, window.innerWidth - horizontalInset - centerX)
      )
      const constrainedY = Math.max(
        bounds.top - centerY,
        Math.min(deltaY, bounds.bottom - centerY)
      )

      if (constrainedX) {
        x.set(x.get() + constrainedX)
      }
      if (constrainedY) {
        y.set(
          y.get() + constrainedY * (boundsElement.offsetHeight / bounds.height)
        )
      }
    },
    [boundsRef, x, y]
  )

  useEffect(() => {
    const element = stickerRef.current
    const bounds = boundsRef.current
    if (!element || !bounds) return

    const observer = new ResizeObserver(() => moveWithinBounds(element))
    observer.observe(bounds)
    observer.observe(element)
    return () => observer.disconnect()
  }, [boundsRef, moveWithinBounds])

  const rotateRandomly = () => {
    let angle = Math.random() * 30 - 15
    if (Math.abs(angle - rotate.get()) < 5) {
      angle += rotate.get() >= 0 ? -10 : 10
    }
    rotate.set(angle)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 20 : 8
    let deltaX = 0
    let deltaY = 0

    if (event.key === 'ArrowLeft') deltaX = -step
    else if (event.key === 'ArrowRight') deltaX = step
    else if (event.key === 'ArrowUp') deltaY = -step
    else if (event.key === 'ArrowDown') deltaY = step
    else return

    moveWithinBounds(event.currentTarget, deltaX, deltaY)
    event.preventDefault()
  }

  return (
    <motion.button
      ref={stickerRef}
      type="button"
      drag
      dragMomentum={false}
      onDragStart={() => {
        didDrag.current = true
      }}
      onDrag={() => {
        if (stickerRef.current) moveWithinBounds(stickerRef.current)
      }}
      onDragEnd={() => {
        if (stickerRef.current) moveWithinBounds(stickerRef.current)
        rotateRandomly()
      }}
      onPointerDown={() => {
        didDrag.current = false
      }}
      onClick={(event) => {
        if (didDrag.current && event.detail !== 0) return
        rotateRandomly()
      }}
      onKeyDown={handleKeyDown}
      aria-label={
        isZh
          ? `点击或拖放${alt}以随机旋转`
          : `Click or drag ${alt} to rotate it randomly`
      }
      style={{
        x,
        y,
        rotate,
        left: initialPosition?.left,
        top: initialPosition ? `${initialPosition.top}%` : 0,
        visibility: initialPosition ? 'visible' : 'hidden',
      }}
      className={`pointer-events-auto absolute [translate:0_-50%] cursor-grab touch-none border-0 bg-transparent p-0 drop-shadow-[0_9px_12px_rgba(15,23,42,0.2)] focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 active:cursor-grabbing ${sticker.className}`}
    >
      <img
        src={sticker.src}
        alt={alt}
        draggable={false}
        className="block h-auto w-full select-none"
        loading="lazy"
        decoding="async"
      />
    </motion.button>
  )
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}
