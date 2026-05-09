'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { motion, type Transition } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TextProps {
  children: ReactNode
  reverse?: boolean
  transition?: Transition
  splitBy?: 'words' | 'characters' | 'lines' | string
  staggerDuration?: number
  staggerFrom?: 'first' | 'last' | 'center' | 'random' | number
  containerClassName?: string
  wordLevelClassName?: string
  elementLevelClassName?: string
  onClick?: () => void
  onStart?: () => void
  onComplete?: () => void
  autoStart?: boolean
}

export interface VerticalCutRevealRef {
  startAnimation: () => void
  reset: () => void
}

interface WordObject {
  characters: string[]
  needsSpace: boolean
}

function splitIntoCharacters(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
  }

  return Array.from(text)
}

const VerticalCutReveal = forwardRef<VerticalCutRevealRef, TextProps>(
  (
    {
      children,
      reverse = false,
      transition = {
        type: 'spring',
        stiffness: 190,
        damping: 22,
      },
      splitBy = 'words',
      staggerDuration = 0.2,
      staggerFrom = 'first',
      containerClassName,
      wordLevelClassName,
      elementLevelClassName,
      onClick,
      onStart,
      onComplete,
      autoStart = true,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLSpanElement>(null)
    const text =
      typeof children === 'string' ? children : String(children ?? '')
    const [isAnimating, setIsAnimating] = useState(false)

    const elements = useMemo(() => {
      const words = text.split(' ')

      if (splitBy === 'characters') {
        return words.map((word, index) => ({
          characters: splitIntoCharacters(word),
          needsSpace: index !== words.length - 1,
        }))
      }

      return splitBy === 'words'
        ? text.split(' ')
        : splitBy === 'lines'
          ? text.split('\n')
          : text.split(splitBy)
    }, [text, splitBy])

    const totalElements = useMemo(() => {
      if (splitBy !== 'characters') return elements.length

      return (elements as WordObject[]).reduce(
        (sum, word) => sum + word.characters.length + (word.needsSpace ? 1 : 0),
        0
      )
    }, [elements, splitBy])

    const getStaggerDelay = useCallback(
      (index: number) => {
        if (staggerFrom === 'first') return index * staggerDuration
        if (staggerFrom === 'last') {
          return (totalElements - 1 - index) * staggerDuration
        }
        if (staggerFrom === 'center') {
          const center = Math.floor(totalElements / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === 'random') {
          const randomIndex = Math.floor(Math.random() * totalElements)
          return Math.abs(randomIndex - index) * staggerDuration
        }

        return Math.abs(staggerFrom - index) * staggerDuration
      },
      [staggerFrom, staggerDuration, totalElements]
    )

    const startAnimation = useCallback(() => {
      setIsAnimating(true)
      onStart?.()
    }, [onStart])

    const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
      if (!onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }

    useImperativeHandle(ref, () => ({
      startAnimation,
      reset: () => setIsAnimating(false),
    }))

    useEffect(() => {
      if (autoStart) {
        startAnimation()
      }
    }, [autoStart, startAnimation])

    const variants = {
      hidden: { y: reverse ? '-100%' : '100%' },
      visible: (index: number) => ({
        y: 0,
        transition: {
          ...transition,
          delay: ((transition?.delay as number) || 0) + getStaggerDelay(index),
        },
      }),
    }

    return (
      <span
        className={cn(
          'flex flex-wrap whitespace-pre-wrap',
          splitBy === 'lines' && 'flex-col',
          containerClassName
        )}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        ref={containerRef}
        {...props}
      >
        <span className="sr-only">{text}</span>

        {(splitBy === 'characters'
          ? (elements as WordObject[])
          : (elements as string[]).map((element, index) => ({
              characters: [element],
              needsSpace: index !== elements.length - 1,
            }))
        ).map((wordObj, wordIndex, array) => {
          const previousCharsCount = array
            .slice(0, wordIndex)
            .reduce((sum, word) => sum + word.characters.length, 0)

          return (
            <span
              key={wordIndex}
              aria-hidden="true"
              className={cn('inline-flex overflow-hidden', wordLevelClassName)}
            >
              {wordObj.characters.map((char, charIndex) => (
                <span
                  className={cn(
                    elementLevelClassName,
                    'relative whitespace-pre-wrap'
                  )}
                  key={charIndex}
                >
                  <motion.span
                    custom={previousCharsCount + charIndex}
                    initial="hidden"
                    animate={isAnimating ? 'visible' : 'hidden'}
                    variants={variants}
                    onAnimationComplete={
                      wordIndex === elements.length - 1 &&
                      charIndex === wordObj.characters.length - 1
                        ? onComplete
                        : undefined
                    }
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                </span>
              ))}
              {wordObj.needsSpace && <span> </span>}
            </span>
          )
        })}
      </span>
    )
  }
)

VerticalCutReveal.displayName = 'VerticalCutReveal'

export { VerticalCutReveal }
