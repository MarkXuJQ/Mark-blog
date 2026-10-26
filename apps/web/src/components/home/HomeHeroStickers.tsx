import {
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { motion, useMotionValue } from 'framer-motion'
import batmanSticker from '@/assets/home/stickers/batman.webp'
import playstationSticker from '@/assets/home/stickers/playstation-symbols.webp'
import chatGptSticker from '@/assets/home/stickers/think-less-more-chatgpt.webp'

const STICKERS = [
  {
    src: playstationSticker,
    alt: { zh: 'PlayStation 按键符号贴纸', en: 'PlayStation symbols sticker' },
    className:
      'left-[18%] top-[23%] w-[76px] sm:left-[15%] sm:w-[108px] lg:left-[13%] lg:w-[132px]',
  },
  {
    src: chatGptSticker,
    alt: {
      zh: 'Think Less More ChatGPT 贴纸',
      en: 'Think Less More ChatGPT sticker',
    },
    className:
      'left-[66%] top-[83%] w-[176px] sm:left-[74%] sm:top-[80%] sm:w-[248px] lg:left-[82%] lg:top-[78%] lg:w-[312px]',
  },
  {
    src: batmanSticker,
    alt: { zh: '蝙蝠侠贴纸', en: 'Batman sticker' },
    className:
      'left-[32%] top-[82%] w-[184px] sm:left-[26%] sm:top-[80%] sm:w-[248px] lg:left-[18%] lg:top-[78%] lg:w-[300px]',
  },
] as const

export function HomeHeroStickers({ isZh }: { isZh: boolean }) {
  const safeBoundsRef = useRef<HTMLDivElement>(null)

  return (
    <div
      role="group"
      aria-label={
        isZh
          ? '点击或拖放后会随机旋转的贴纸'
          : 'Stickers that rotate after clicking or dragging'
      }
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div
        ref={safeBoundsRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-[5%]"
      />
      <div className="pointer-events-none absolute inset-0">
        {STICKERS.map((sticker) => (
          <Sticker
            key={sticker.src}
            sticker={sticker}
            boundsRef={safeBoundsRef}
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
  isZh,
}: {
  sticker: (typeof STICKERS)[number]
  boundsRef: RefObject<HTMLDivElement | null>
  isZh: boolean
}) {
  const stickerRef = useRef<HTMLButtonElement>(null)
  const didDrag = useRef(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useMotionValue(0)
  const alt = isZh ? sticker.alt.zh : sticker.alt.en

  useEffect(() => {
    rotate.set(Math.random() * 30 - 15)
  }, [rotate])

  const moveWithinBounds = useCallback(
    (element: HTMLButtonElement, deltaX = 0, deltaY = 0) => {
      const boundsElement = boundsRef.current
      if (!boundsElement) return

      const bounds = boundsElement.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return

      const rect = element.getBoundingClientRect()
      const centerX = (rect.left + rect.right) / 2
      const centerY = (rect.top + rect.bottom) / 2
      const constrainedX = Math.max(
        bounds.left - centerX,
        Math.min(deltaX, bounds.right - centerX)
      )
      const constrainedY = Math.max(
        bounds.top - centerY,
        Math.min(deltaY, bounds.bottom - centerY)
      )

      if (constrainedX) {
        x.set(
          x.get() + constrainedX * (boundsElement.offsetWidth / bounds.width)
        )
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
      style={{ x, y, rotate }}
      onKeyDown={handleKeyDown}
      aria-label={
        isZh
          ? `点击或拖放${alt}以随机旋转`
          : `Click or drag ${alt} to rotate it randomly`
      }
      className={`pointer-events-auto absolute [translate:-50%_-50%] cursor-grab touch-none border-0 bg-transparent p-0 drop-shadow-[0_9px_12px_rgba(15,23,42,0.2)] focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 active:cursor-grabbing ${sticker.className}`}
    >
      <img
        src={sticker.src}
        alt={alt}
        draggable={false}
        className="block h-auto w-full select-none"
        loading="eager"
        decoding="async"
      />
    </motion.button>
  )
}
