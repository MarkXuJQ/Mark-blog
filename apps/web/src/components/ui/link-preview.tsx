'use client'

import * as RdxHoverCard from '@radix-ui/react-hover-card'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  type MotionValue,
  type MotionStyle,
} from 'framer-motion'
import { ExternalLink, Globe2 } from 'lucide-react'
import React, {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

function usePreviewSource(
  url: string,
  width: number,
  height: number,
  quality: number,
  isStatic: boolean,
  staticImageSrc?: string
) {
  if (isStatic) {
    return staticImageSrc || ''
  }

  void height
  void quality

  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${Math.round(width * 3)}`
}

function useHoverState(followMouse: boolean) {
  const [isPeeking, setPeeking] = useState(false)
  const mouseX = useMotionValue(0)
  const springConfig = { stiffness: 120, damping: 20 }
  const followX = useSpring(mouseX, springConfig)

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!followMouse) return

      const targetRect = event.currentTarget.getBoundingClientRect()
      const eventOffsetX = event.clientX - targetRect.left
      const offsetFromCenter = (eventOffsetX - targetRect.width / 2) * 0.3
      mouseX.set(offsetFromCenter)
    },
    [followMouse, mouseX]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setPeeking(open)

      if (!open) {
        mouseX.set(0)
      }
    },
    [mouseX]
  )

  return { isPeeking, handleOpenChange, handlePointerMove, followX }
}

type HoverPeekConfig = {
  url: string
  previewUrl?: string
  className?: string
  peekWidth?: number
  peekHeight?: number
  imageQuality?: number
  enableMouseFollow?: boolean
  enableLensEffect?: boolean
  lensZoomFactor?: number
  lensSize?: number
} & (
  | { isStatic: true; imageSrc: string }
  | { isStatic?: false; imageSrc?: never }
)

export type HoverPeekProps = HoverPeekConfig & {
  children: ReactNode
}

type LinkPreviewCardProps = {
  url: string
  previewUrl?: string
  peekWidth?: number
  peekHeight?: number
  imageQuality?: number
  isStatic?: boolean
  imageSrc?: string
  enableLensEffect?: boolean
  lensZoomFactor?: number
  lensSize?: number
  followX?: MotionValue<number> | number
  clickable?: boolean
  containerClassName?: string
  containerStyle?: MotionStyle
  className?: string
}

export type LinkPreviewMetadataCardProps = {
  title: string
  description?: string
  badge?: string
  imageSrc?: string
  urlLabel?: string
  href?: string
  followX?: MotionValue<number> | number
  clickable?: boolean
  containerClassName?: string
  containerStyle?: MotionStyle
  className?: string
}

const cardMotionVariants = {
  initial: { opacity: 0, rotateY: -90, transition: { duration: 0.15 } },
  animate: {
    opacity: 1,
    rotateY: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 18 },
  },
  exit: { opacity: 0, rotateY: 90, transition: { duration: 0.15 } },
}

const lensMotionVariants = {
  initial: { opacity: 0, scale: 0.7 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    scale: 0.7,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

function PreviewMotionFrame({
  children,
  followX = 0,
  containerClassName,
  containerStyle,
}: {
  children: ReactNode
  followX?: MotionValue<number> | number
  containerClassName?: string
  containerStyle?: MotionStyle
}) {
  return (
    <motion.div
      data-link-preview-content="true"
      variants={cardMotionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={containerClassName}
      style={{
        x: followX,
        pointerEvents: 'auto',
        ...containerStyle,
      }}
    >
      {children}
    </motion.div>
  )
}

export function LinkPreviewCard({
  url,
  previewUrl,
  peekWidth = 200,
  peekHeight = 125,
  imageQuality = 50,
  isStatic = false,
  imageSrc = '',
  enableLensEffect = true,
  lensZoomFactor = 1.75,
  lensSize = 100,
  followX = 0,
  clickable = true,
  containerClassName,
  containerStyle,
  className,
}: LinkPreviewCardProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const [isHoveringLens, setIsHoveringLens] = useState(false)
  const [lensMousePosition, setLensMousePosition] = useState({ x: 0, y: 0 })

  const finalImageSrc = usePreviewSource(
    previewUrl || url,
    peekWidth,
    peekHeight,
    imageQuality,
    isStatic,
    imageSrc
  )

  useEffect(() => {
    setImageLoadFailed(false)
  }, [finalImageSrc])

  const handleLensMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (!enableLensEffect) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    setLensMousePosition({ x, y })
  }

  const handleLensMouseEnter = () => {
    if (enableLensEffect) {
      setIsHoveringLens(true)
    }
  }

  const handleLensMouseLeave = () => {
    if (enableLensEffect) {
      setIsHoveringLens(false)
    }
  }

  const frameClassName = cn(
    'relative block overflow-hidden rounded-lg border border-neutral-200 bg-white p-0.5 shadow-lg transition-shadow hover:shadow-xl',
    'dark:border-neutral-700 dark:bg-neutral-900',
    className
  )

  const previewMedia = imageLoadFailed ? (
    <div
      className="flex flex-col items-center justify-center gap-2 bg-neutral-100 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      style={{ width: peekWidth, height: peekHeight }}
    >
      <Globe2 className="h-5 w-5" />
      <span>Preview unavailable</span>
    </div>
  ) : (
    <img
      src={finalImageSrc}
      width={peekWidth}
      height={peekHeight}
      className="block rounded-[5px] bg-neutral-50 align-top pointer-events-none dark:bg-neutral-800"
      alt={`Link preview for ${previewUrl || url}`}
      onError={() => setImageLoadFailed(true)}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      referrerPolicy="no-referrer"
    />
  )

  const lensLayer = (
    <AnimatePresence>
      {enableLensEffect && isHoveringLens && !imageLoadFailed ? (
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
          variants={lensMotionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            maskImage: `radial-gradient(circle ${lensSize / 2}px at ${lensMousePosition.x}px ${lensMousePosition.y}px, black ${lensSize / 2}px, transparent ${lensSize / 2}px)`,
            WebkitMaskImage: `radial-gradient(circle ${lensSize / 2}px at ${lensMousePosition.x}px ${lensMousePosition.y}px, black ${lensSize / 2}px, transparent ${lensSize / 2}px)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${lensZoomFactor})`,
              transformOrigin: `${lensMousePosition.x}px ${lensMousePosition.y}px`,
            }}
          >
            <img
              src={finalImageSrc}
              width={peekWidth}
              height={peekHeight}
              className="block rounded-[5px] bg-neutral-50 align-top dark:bg-neutral-800"
              alt=""
              aria-hidden="true"
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return (
    <PreviewMotionFrame
      followX={followX}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
    >
      {clickable ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={frameClassName}
          onMouseEnter={handleLensMouseEnter}
          onMouseLeave={handleLensMouseLeave}
          onMouseMove={handleLensMouseMove}
        >
          {previewMedia}
          {lensLayer}
        </a>
      ) : (
        <div
          className={frameClassName}
          onMouseEnter={handleLensMouseEnter}
          onMouseLeave={handleLensMouseLeave}
          onMouseMove={handleLensMouseMove}
        >
          {previewMedia}
          {lensLayer}
        </div>
      )}
    </PreviewMotionFrame>
  )
}

export function LinkPreviewMetadataCard({
  title,
  description,
  badge,
  imageSrc,
  urlLabel,
  href,
  followX = 0,
  clickable = false,
  containerClassName,
  containerStyle,
  className,
}: LinkPreviewMetadataCardProps) {
  const cardClassName = cn(
    'group block w-[22rem] overflow-hidden rounded-[18px] border border-slate-200/90 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm',
    'dark:border-[#2b2f36] dark:bg-[#17191c]',
    className
  )

  const content = (
    <>
      {imageSrc ? (
        <div className="relative h-36 overflow-hidden bg-slate-100 dark:bg-[#23262c]">
          <img
            src={imageSrc}
            alt={title}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent dark:from-black/55" />
        </div>
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {badge ? (
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {badge}
              </div>
            ) : null}
            <div className="mt-1 line-clamp-2 text-[1rem] font-semibold leading-6 text-slate-950 dark:text-slate-50">
              {title}
            </div>
          </div>
          {href ? (
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          ) : null}
        </div>

        {description ? (
          <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {description}
          </p>
        ) : null}

        {urlLabel ? (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Globe2 className="h-3.5 w-3.5" />
            <span className="truncate">{urlLabel}</span>
          </div>
        ) : null}
      </div>
    </>
  )

  return (
    <PreviewMotionFrame
      followX={followX}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
    >
      {clickable && href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cardClassName}
        >
          {content}
        </a>
      ) : (
        <div className={cardClassName}>{content}</div>
      )}
    </PreviewMotionFrame>
  )
}

export const HoverPeek = ({
  children,
  url,
  previewUrl,
  className,
  peekWidth = 200,
  peekHeight = 125,
  imageQuality = 50,
  isStatic = false,
  imageSrc = '',
  enableMouseFollow = true,
  enableLensEffect = true,
  lensZoomFactor = 1.75,
  lensSize = 100,
}: HoverPeekProps) => {
  const { isPeeking, handleOpenChange, handlePointerMove, followX } =
    useHoverState(enableMouseFollow)

  const triggerChild = React.isValidElement<{
    className?: string
    onPointerMove?: React.PointerEventHandler<HTMLElement>
  }>(children)
    ? React.cloneElement(children, {
        className: cn(children.props.className, className),
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
          children.props.onPointerMove?.(event)
          handlePointerMove(event)
        },
      })
    : (
        <span className={className} onPointerMove={handlePointerMove}>
          {children}
        </span>
      )

  return (
    <RdxHoverCard.Root
      openDelay={75}
      closeDelay={150}
      onOpenChange={handleOpenChange}
    >
      <RdxHoverCard.Trigger asChild>{triggerChild}</RdxHoverCard.Trigger>

      <RdxHoverCard.Portal>
        <RdxHoverCard.Content
          className="[perspective:800px] [--radix-hover-card-content-transform-origin:center_center] z-[120]"
          side="top"
          align="center"
          sideOffset={12}
          style={{ pointerEvents: enableLensEffect ? 'none' : 'auto' }}
        >
          <AnimatePresence>
            {isPeeking ? (
              <LinkPreviewCard
                url={url}
                previewUrl={previewUrl}
                peekWidth={peekWidth}
                peekHeight={peekHeight}
                imageQuality={imageQuality}
                isStatic={isStatic}
                imageSrc={imageSrc}
                enableLensEffect={enableLensEffect}
                lensZoomFactor={lensZoomFactor}
                lensSize={lensSize}
                followX={enableMouseFollow ? followX : 0}
              />
            ) : null}
          </AnimatePresence>
        </RdxHoverCard.Content>
      </RdxHoverCard.Portal>
    </RdxHoverCard.Root>
  )
}
