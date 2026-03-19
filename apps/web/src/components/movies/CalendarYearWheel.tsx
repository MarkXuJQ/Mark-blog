import { ChevronDown } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn } from '../../utils/cn'
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
  useDropdown,
} from '../ui/Dropdown'

const VISIBLE_YEAR_COUNT = 5
const YEAR_ITEM_HEIGHT = 40
const WHEEL_HEIGHT = VISIBLE_YEAR_COUNT * YEAR_ITEM_HEIGHT
const WHEEL_PADDING = (WHEEL_HEIGHT - YEAR_ITEM_HEIGHT) / 2
const POINTER_DRAG_STEP_THRESHOLD = 24
const DESKTOP_WHEEL_STEP_THRESHOLD = 24

interface CalendarYearWheelProps {
  years: number[]
  value: number
  onValueChange: (year: number) => void
  label: string
  ariaLabel: string
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0
  return Math.max(0, Math.min(length - 1, index))
}

function getYearDepthClass(distance: number) {
  if (distance <= 0) {
    return 'scale-[1.08] opacity-100 text-slate-950 drop-shadow-[0_1px_8px_rgba(15,23,42,0.18)] dark:text-slate-50 dark:drop-shadow-[0_1px_10px_rgba(148,163,184,0.18)]'
  }

  if (distance === 1) {
    return 'scale-[0.94] opacity-40 text-slate-500 dark:text-slate-400'
  }

  if (distance === 2) {
    return 'scale-[0.82] opacity-14 text-slate-400 dark:text-slate-600'
  }

  return 'scale-[0.72] opacity-0 text-slate-400 dark:text-slate-700'
}

function CalendarYearWheelControl(props: CalendarYearWheelProps) {
  const { years, value, onValueChange, ariaLabel, label } = props
  const { isOpen, setIsOpen } = useDropdown()
  const controlRootRef = useRef<HTMLDivElement>(null)
  const wheelDeltaRef = useRef(0)
  const wheelViewportRef = useRef<HTMLDivElement>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const lastPointerYRef = useRef(0)
  const pointerDistanceRef = useRef(0)
  const selectedIndexRef = useRef(0)
  const suppressClickRef = useRef(false)
  const suppressClickTimeoutRef = useRef<number | null>(null)
  const valueRef = useRef(value)

  const selectedIndex = clampIndex(years.indexOf(value), years.length)
  const selectedYear = years[selectedIndex] ?? value

  const translateY = useMemo(
    () => WHEEL_PADDING - selectedIndex * YEAR_ITEM_HEIGHT,
    [selectedIndex]
  )

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
    valueRef.current = value
  }, [selectedIndex, value])

  const commitIndex = (nextIndex: number, closeAfterChange = false) => {
    const safeIndex = clampIndex(nextIndex, years.length)
    const nextYear = years[safeIndex]
    if (typeof nextYear !== 'number') return

    wheelDeltaRef.current = 0

    if (nextYear !== valueRef.current) {
      onValueChange(nextYear)
    }

    if (closeAfterChange) {
      setIsOpen(false)
    }
  }

  const moveBySteps = (deltaSteps: number) => {
    if (deltaSteps === 0) return
    commitIndex(selectedIndexRef.current + deltaSteps)
  }

  const processDelta = (
    deltaY: number,
    options: { threshold: number; maxSteps?: number }
  ) => {
    if (years.length <= 1) return
    const { threshold, maxSteps } = options

    wheelDeltaRef.current += deltaY
    let stepCount = 0

    while (Math.abs(wheelDeltaRef.current) >= threshold) {
      const direction = wheelDeltaRef.current > 0 ? 1 : -1
      stepCount += direction
      wheelDeltaRef.current -= direction * threshold
    }

    if (stepCount !== 0) {
      const limitedStepCount =
        typeof maxSteps === 'number'
          ? Math.sign(stepCount) * Math.min(Math.abs(stepCount), maxSteps)
          : stepCount

      moveBySteps(limitedStepCount)
    }
  }

  const clearSuppressedClick = () => {
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current)
      suppressClickTimeoutRef.current = null
    }
    suppressClickRef.current = false
  }

  const resetPointerState = () => {
    activePointerIdRef.current = null
    lastPointerYRef.current = 0
    pointerDistanceRef.current = 0
    wheelDeltaRef.current = 0
  }

  useEffect(() => {
    if (!isOpen) return

    const controlRoot = controlRootRef.current
    const wheelViewport = wheelViewportRef.current
    if (!controlRoot || !wheelViewport) return

    wheelViewport.focus({ preventScroll: true })

    const handleDesktopWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      processDelta(event.deltaY, {
        threshold: DESKTOP_WHEEL_STEP_THRESHOLD,
        maxSteps: 1,
      })
    }

    controlRoot.addEventListener('wheel', handleDesktopWheel, {
      passive: false,
    })

    return () => {
      controlRoot.removeEventListener('wheel', handleDesktopWheel)
      clearSuppressedClick()
      resetPointerState()
    }
  }, [isOpen])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return

    clearSuppressedClick()
    suppressClickRef.current = false
    activePointerIdRef.current = event.pointerId
    lastPointerYRef.current = event.clientY
    pointerDistanceRef.current = 0
    wheelDeltaRef.current = 0
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus({ preventScroll: true })
  }

  const finishPointerInteraction = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (activePointerIdRef.current !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (suppressClickRef.current) {
      suppressClickTimeoutRef.current = window.setTimeout(() => {
        suppressClickRef.current = false
        suppressClickTimeoutRef.current = null
      }, 0)
    }

    resetPointerState()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return

    const deltaY = lastPointerYRef.current - event.clientY
    if (deltaY === 0) return

    event.preventDefault()
    event.stopPropagation()

    lastPointerYRef.current = event.clientY
    pointerDistanceRef.current += Math.abs(deltaY)

    if (pointerDistanceRef.current >= 6) {
      suppressClickRef.current = true
    }

    processDelta(deltaY, {
      threshold: POINTER_DRAG_STEP_THRESHOLD,
    })
  }

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    clearSuppressedClick()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveBySteps(1)
        return
      case 'ArrowUp':
        event.preventDefault()
        moveBySteps(-1)
        return
      case 'PageDown':
        event.preventDefault()
        moveBySteps(3)
        return
      case 'PageUp':
        event.preventDefault()
        moveBySteps(-3)
        return
      case 'Home':
        event.preventDefault()
        commitIndex(0)
        return
      case 'End':
        event.preventDefault()
        commitIndex(years.length - 1)
        return
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        return
      default:
        return
    }
  }

  return (
    <div ref={controlRootRef} className="relative">
      <DropdownTrigger
        aria-label={ariaLabel}
        className={cn(
          'group flex min-w-[4.875rem] cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm transition-[border-color,background-color,color,box-shadow] hover:border-slate-300 hover:bg-slate-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-w-[10rem] sm:gap-3 sm:px-4 sm:py-3 sm:text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900/90 dark:focus-visible:ring-blue-500/60 dark:focus-visible:ring-offset-slate-950',
          isOpen &&
            'border-slate-300 bg-slate-50/95 text-slate-700 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200'
        )}
      >
        <span className="hidden shrink-0 sm:inline">{label}</span>
        <span
          className={cn(
            'flex min-w-[3.875rem] items-center justify-center gap-1 text-sm font-medium text-slate-900 transition-opacity duration-200 sm:ml-auto sm:min-w-[4.5rem] sm:justify-end sm:gap-2 sm:text-base dark:text-slate-100',
            isOpen && 'opacity-0'
          )}
        >
          <span>{selectedYear}</span>
          <ChevronDown
            size={14}
            className={cn(
              'shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </span>
      </DropdownTrigger>

      <DropdownContent
        align="end"
        className="!top-1/2 !right-1 !mt-0 !min-w-0 origin-center -translate-y-1/2 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0 sm:!right-3"
      >
        <div className="relative w-[4.25rem] overflow-hidden bg-transparent px-0 py-0 shadow-none sm:w-[4.5rem] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
          <div className="relative" style={{ height: `${WHEEL_HEIGHT}px` }}>
            <div
              role="listbox"
              ref={wheelViewportRef}
              tabIndex={0}
              aria-label={ariaLabel}
              aria-activedescendant={`calendar-year-${selectedYear}`}
              className="relative z-[3] h-full touch-none overflow-hidden overscroll-contain outline-none select-none"
              onClickCapture={handleClickCapture}
              onKeyDown={handleKeyDown}
              onPointerCancel={finishPointerInteraction}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerInteraction}
              onMouseEnter={() => {
                wheelViewportRef.current?.focus({ preventScroll: true })
              }}
            >
              <div
                className="absolute inset-x-0 will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  transform: `translateY(${translateY}px)`,
                }}
              >
                {years.map((year, index) => {
                  const distance = Math.abs(index - selectedIndex)
                  return (
                    <button
                      key={year}
                      id={`calendar-year-${year}`}
                      type="button"
                      role="option"
                      aria-selected={year === value}
                      className={cn(
                        'relative z-[4] flex h-10 w-full items-center justify-center rounded-full text-sm font-semibold tracking-[0.04em] tabular-nums transition-[transform,opacity,color,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:text-base sm:tracking-[0.06em]',
                        getYearDepthClass(distance)
                      )}
                      onClick={() => commitIndex(index)}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </DropdownContent>
    </div>
  )
}

export function CalendarYearWheel(props: CalendarYearWheelProps) {
  if (props.years.length <= 0) return null

  return (
    <Dropdown className="relative shrink-0">
      <CalendarYearWheelControl {...props} />
    </Dropdown>
  )
}
