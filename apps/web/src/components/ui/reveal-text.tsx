'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

interface RevealTextProps {
  text?: string
  textColor?: string
  overlayColor?: string
  fontSize?: string
  letterDelay?: number
  overlayDelay?: number
  overlayDuration?: number
  springDuration?: number
  letterImages?: string[]
  imageStartPosition?: string
  imageHoverPosition?: string
  className?: string
  align?: 'left' | 'center' | 'right'
}

const DEFAULT_LETTER_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
]

const ALIGNMENT_CLASS_MAP: Record<
  NonNullable<RevealTextProps['align']>,
  string
> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

export function RevealText({
  text = 'STUNNING',
  textColor = 'text-white',
  overlayColor = 'text-red-500',
  fontSize = 'text-[250px]',
  letterDelay = 0.08,
  overlayDelay = 0.05,
  overlayDuration = 0.4,
  springDuration = 600,
  letterImages = DEFAULT_LETTER_IMAGES,
  imageStartPosition = '0% center',
  imageHoverPosition = '10% center',
  className,
  align = 'center',
}: RevealTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [showOverlayText, setShowOverlayText] = useState(false)

  useEffect(() => {
    const lastLetterDelay = Math.max(0, text.length - 1) * letterDelay
    const totalDelay = lastLetterDelay * 1000 + springDuration

    const timer = window.setTimeout(() => {
      setShowOverlayText(true)
    }, totalDelay)

    return () => window.clearTimeout(timer)
  }, [text.length, letterDelay, springDuration])

  return (
    <div
      className={cn(
        'relative flex items-center overflow-hidden',
        ALIGNMENT_CLASS_MAP[align],
        className
      )}
    >
      <div className="flex">
        {text.split('').map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              fontSize,
              'relative cursor-pointer overflow-hidden leading-none font-black tracking-tight select-none'
            )}
            initial={{
              scale: 0,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              delay: index * letterDelay,
              type: 'spring',
              damping: 8,
              stiffness: 200,
              mass: 0.8,
            }}
          >
            <motion.span
              className={cn('absolute inset-0', textColor)}
              animate={{
                opacity: hoveredIndex === index ? 0 : 1,
              }}
              transition={{ duration: 0.1 }}
            >
              {letter}
            </motion.span>

            <motion.span
              className="bg-cover bg-clip-text bg-no-repeat text-transparent"
              animate={{
                opacity: hoveredIndex === index ? 1 : 0,
                backgroundPosition:
                  hoveredIndex === index
                    ? imageHoverPosition
                    : imageStartPosition,
              }}
              transition={{
                opacity: { duration: 0.1 },
                backgroundPosition: {
                  duration: 3,
                  ease: 'easeInOut',
                },
              }}
              style={{
                backgroundImage: `url('${letterImages[index % letterImages.length]}')`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {letter}
            </motion.span>

            {showOverlayText ? (
              <motion.span
                className={cn(
                  'pointer-events-none absolute inset-0',
                  overlayColor
                )}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  delay: index * overlayDelay,
                  duration: overlayDuration,
                  times: [0, 0.1, 0.7, 1],
                  ease: 'easeInOut',
                }}
              >
                {letter}
              </motion.span>
            ) : null}
          </motion.span>
        ))}
      </div>
    </div>
  )
}
