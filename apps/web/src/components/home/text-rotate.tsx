'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import {
  AnimatePresence,
  motion,
  type AnimatePresenceProps,
  type MotionProps,
  type Transition,
} from 'framer-motion'

import { cn } from '@/lib/classNames'

interface TextRotateProps {
  texts: string[]
  rotationInterval?: number
  initial?: MotionProps['initial']
  animate?: MotionProps['animate']
  exit?: MotionProps['exit']
  animatePresenceMode?: AnimatePresenceProps['mode']
  animatePresenceInitial?: boolean
  staggerDuration?: number
  staggerFrom?: 'first' | 'last' | 'center' | number | 'random'
  transition?: Transition
  layoutTransition?: Transition
  loop?: boolean
  auto?: boolean
  splitBy?: 'words' | 'characters' | 'lines' | string
  onNext?: (index: number) => void
  mainClassName?: string
  splitLevelClassName?: string
  elementLevelClassName?: string
}

export interface TextRotateRef {
  next: () => void
  previous: () => void
  jumpTo: (index: number) => void
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

const TextRotate = forwardRef<TextRotateRef, TextRotateProps>(
  (
    {
      texts,
      transition = { type: 'spring', damping: 25, stiffness: 300 },
      initial = { y: '100%', opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: '-120%', opacity: 0 },
      animatePresenceMode = 'wait',
      animatePresenceInitial = false,
      rotationInterval = 2000,
      staggerDuration = 0,
      staggerFrom = 'first',
      loop = true,
      auto = true,
      splitBy = 'characters',
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      layoutTransition,
      ...props
    },
    ref
  ) => {
    const safeTexts = useMemo(
      () => texts.filter((text) => text.trim().length > 0),
      [texts]
    )
    const [currentTextIndex, setCurrentTextIndex] = useState(0)
    const currentText = safeTexts[currentTextIndex] ?? safeTexts[0] ?? ''

    const elements = useMemo(() => {
      if (splitBy === 'characters') {
        const words = currentText.split(' ')
        return words.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== words.length - 1,
        }))
      }

      return splitBy === 'words'
        ? currentText.split(' ')
        : splitBy === 'lines'
          ? currentText.split('\n')
          : currentText.split(splitBy)
    }, [currentText, splitBy])

    const getStaggerDelay = useCallback(
      (index: number, totalChars: number) => {
        const total = totalChars
        if (staggerFrom === 'first') return index * staggerDuration
        if (staggerFrom === 'last') {
          return (total - 1 - index) * staggerDuration
        }
        if (staggerFrom === 'center') {
          const center = Math.floor(total / 2)
          return Math.abs(center - index) * staggerDuration
        }
        if (staggerFrom === 'random') {
          const randomIndex = Math.floor(Math.random() * total)
          return Math.abs(randomIndex - index) * staggerDuration
        }
        return Math.abs(staggerFrom - index) * staggerDuration
      },
      [staggerFrom, staggerDuration]
    )

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex)
        onNext?.(newIndex)
      },
      [onNext]
    )

    const next = useCallback(() => {
      if (safeTexts.length <= 1) return

      const nextIndex =
        currentTextIndex === safeTexts.length - 1
          ? loop
            ? 0
            : currentTextIndex
          : currentTextIndex + 1

      if (nextIndex !== currentTextIndex) {
        handleIndexChange(nextIndex)
      }
    }, [currentTextIndex, handleIndexChange, loop, safeTexts.length])

    const previous = useCallback(() => {
      if (safeTexts.length <= 1) return

      const prevIndex =
        currentTextIndex === 0
          ? loop
            ? safeTexts.length - 1
            : currentTextIndex
          : currentTextIndex - 1

      if (prevIndex !== currentTextIndex) {
        handleIndexChange(prevIndex)
      }
    }, [currentTextIndex, handleIndexChange, loop, safeTexts.length])

    const jumpTo = useCallback(
      (index: number) => {
        if (safeTexts.length === 0) return

        const validIndex = Math.max(0, Math.min(index, safeTexts.length - 1))
        if (validIndex !== currentTextIndex) {
          handleIndexChange(validIndex)
        }
      },
      [currentTextIndex, handleIndexChange, safeTexts.length]
    )

    const reset = useCallback(() => {
      if (currentTextIndex !== 0) {
        handleIndexChange(0)
      }
    }, [currentTextIndex, handleIndexChange])

    useImperativeHandle(
      ref,
      () => ({
        next,
        previous,
        jumpTo,
        reset,
      }),
      [jumpTo, next, previous, reset]
    )

    useEffect(() => {
      if (!auto || safeTexts.length <= 1) return

      const intervalId = window.setInterval(next, rotationInterval)
      return () => window.clearInterval(intervalId)
    }, [auto, next, rotationInterval, safeTexts.length])

    if (!currentText) {
      return null
    }

    return (
      <motion.span
        className={cn(
          'inline-flex flex-nowrap whitespace-nowrap',
          mainClassName
        )}
        {...props}
        layout
        transition={layoutTransition ?? transition}
      >
        <span className="sr-only">{currentText}</span>

        <AnimatePresence
          mode={animatePresenceMode}
          initial={animatePresenceInitial}
        >
          <motion.span
            key={currentTextIndex}
            className={cn(
              'flex flex-nowrap whitespace-nowrap',
              splitBy === 'lines' && 'w-full flex-col'
            )}
            layout
            transition={layoutTransition ?? transition}
            aria-hidden="true"
          >
            {(splitBy === 'characters'
              ? (elements as WordObject[])
              : (elements as string[]).map((el, i) => ({
                  characters: [el],
                  needsSpace: i !== elements.length - 1,
                }))
            ).map((wordObj, wordIndex, array) => {
              const previousCharsCount = array
                .slice(0, wordIndex)
                .reduce((sum, word) => sum + word.characters.length, 0)
              const totalChars = array.reduce(
                (sum, word) => sum + word.characters.length,
                0
              )

              return (
                <span
                  key={`${currentTextIndex}-${wordIndex}`}
                  className={cn('inline-flex', splitLevelClassName)}
                >
                  {wordObj.characters.map((char, charIndex) => (
                    <motion.span
                      initial={initial}
                      animate={animate}
                      exit={exit}
                      key={`${char}-${charIndex}`}
                      transition={{
                        ...transition,
                        delay: getStaggerDelay(
                          previousCharsCount + charIndex,
                          totalChars
                        ),
                      }}
                      className={cn('inline-block', elementLevelClassName)}
                    >
                      {char}
                    </motion.span>
                  ))}
                  {wordObj.needsSpace ? (
                    <span className="whitespace-pre"> </span>
                  ) : null}
                </span>
              )
            })}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    )
  }
)

TextRotate.displayName = 'TextRotate'

export { TextRotate }
