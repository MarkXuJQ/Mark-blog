import { ChevronDown } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
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
const WHEEL_STEP_THRESHOLD = 24

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
  const wheelDeltaRef = useRef(0)
  const wheelViewportRef = useRef<HTMLDivElement>(null)

  const selectedIndex = clampIndex(years.indexOf(value), years.length)
  const selectedYear = years[selectedIndex] ?? value

  const translateY = useMemo(
    () => WHEEL_PADDING - selectedIndex * YEAR_ITEM_HEIGHT,
    [selectedIndex]
  )

  const commitIndex = (nextIndex: number, closeAfterChange = false) => {
    const safeIndex = clampIndex(nextIndex, years.length)
    const nextYear = years[safeIndex]
    if (typeof nextYear !== 'number') return

    wheelDeltaRef.current = 0

    if (nextYear !== value) {
      onValueChange(nextYear)
    }

    if (closeAfterChange) {
      setIsOpen(false)
    }
  }

  const moveBySteps = (deltaSteps: number) => {
    if (deltaSteps === 0) return
    commitIndex(selectedIndex + deltaSteps)
  }

  const processWheelDelta = (deltaY: number) => {
    if (years.length <= 1) return

    wheelDeltaRef.current += deltaY
    let stepCount = 0

    while (Math.abs(wheelDeltaRef.current) >= WHEEL_STEP_THRESHOLD) {
      const direction = wheelDeltaRef.current > 0 ? 1 : -1
      stepCount += direction
      wheelDeltaRef.current -= direction * WHEEL_STEP_THRESHOLD
    }

    if (stepCount !== 0) {
      moveBySteps(stepCount)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const wheelViewport = wheelViewportRef.current
    if (!wheelViewport) return

    wheelViewport.focus({ preventScroll: true })

    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      processWheelDelta(event.deltaY)
    }

    wheelViewport.addEventListener('wheel', handleNativeWheel, {
      passive: false,
    })

    return () => {
      wheelViewport.removeEventListener('wheel', handleNativeWheel)
    }
  }, [isOpen, selectedIndex, years.length, value])

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
    <>
      <DropdownTrigger
        aria-label={ariaLabel}
        className={cn(
          'group flex min-w-[10rem] cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition-[border-color,background-color,color,box-shadow] hover:border-slate-300 hover:bg-slate-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900/90 dark:focus-visible:ring-blue-500/60 dark:focus-visible:ring-offset-slate-950',
          isOpen &&
            'border-slate-300 bg-slate-50/95 text-slate-700 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200'
        )}
      >
        <span className="shrink-0">{label}</span>
        <span
          className={cn(
            'ml-auto flex min-w-[4.5rem] items-center justify-end gap-2 font-medium text-slate-900 transition-opacity duration-200 dark:text-slate-100',
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
        className="!top-1/2 !right-3 !mt-0 !min-w-0 origin-center -translate-y-1/2 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0"
      >
        <div className="relative w-[4.5rem] overflow-hidden bg-transparent px-0 py-0 shadow-none [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
          <div className="relative" style={{ height: `${WHEEL_HEIGHT}px` }}>
            <div
              role="listbox"
              ref={wheelViewportRef}
              tabIndex={0}
              aria-label={ariaLabel}
              aria-activedescendant={`calendar-year-${selectedYear}`}
              className="relative z-[3] h-full overflow-hidden overscroll-contain outline-none select-none"
              onKeyDown={handleKeyDown}
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
                        'relative z-[4] flex h-10 w-full items-center justify-center rounded-full text-base font-semibold tracking-[0.06em] tabular-nums transition-[transform,opacity,color,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
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
    </>
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
