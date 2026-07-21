import { useEffect } from 'react'
import { useLenis } from 'lenis/react'

const HOME_SNAP_SELECTOR = '[data-home-snap]'
const HOME_SNAP_LOCK_MS = 720
const HOME_SNAP_WHEEL_THRESHOLD = 8
const HOME_RADAR_SNAP_THRESHOLD_VIEWPORTS = 0.9
const HOME_RADAR_RELEASE_THRESHOLD_VIEWPORTS = 0.35
const HOME_SECTION_EXIT_THRESHOLD_VIEWPORTS = 0.35
const HOME_SECTION_ENTRY_GAP_VIEWPORTS = 0.08
const HOME_PAGER_SUPPRESS_EVENT = 'home:pager-suppress'
const HOME_PAGER_INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  '[role="slider"]',
  '[data-home-no-pager="true"]',
].join(', ')

type HomeSnapSectionName = 'hero' | 'blog' | 'widget' | 'radar'

interface HomeSnapSection {
  name: HomeSnapSectionName
  top: number
}

function getSectionReturnTop(
  sectionName: HomeSnapSectionName,
  sections: HomeSnapSection[],
  viewportHeight: number
) {
  const sectionNode = document.querySelector<HTMLElement>(
    `[data-home-snap="${sectionName}"]`
  )
  const sectionTop = findSectionTop(sections, sectionName, 0)

  if (!sectionNode) return sectionTop

  return Math.max(
    sectionTop,
    sectionTop + Math.max(0, sectionNode.offsetHeight - viewportHeight)
  )
}

function isElementWithinInteractiveZone(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return target.closest(HOME_PAGER_INTERACTIVE_SELECTOR) != null
}

function getSnapSections() {
  return Array.from(document.querySelectorAll<HTMLElement>(HOME_SNAP_SELECTOR))
    .map((section) => {
      const name = section.dataset.homeSnap as HomeSnapSectionName | undefined
      if (!name) return null
      return { name, top: section.offsetTop }
    })
    .filter((section): section is HomeSnapSection => section != null)
    .sort((left, right) => left.top - right.top)
}

function findSectionTop(
  sections: HomeSnapSection[],
  name: HomeSnapSectionName,
  fallbackTop: number
) {
  return sections.find((section) => section.name === name)?.top ?? fallbackTop
}

function getSnapTargetTop(
  currentScrollY: number,
  direction: 1 | -1,
  viewportHeight: number,
  sections: HomeSnapSection[]
) {
  const heroTop = findSectionTop(sections, 'hero', 0)
  const blogTop = findSectionTop(sections, 'blog', viewportHeight)
  const widgetTop = findSectionTop(sections, 'widget', viewportHeight * 2)
  const widgetReturnTop = getSectionReturnTop(
    'widget',
    sections,
    viewportHeight
  )
  const radarTop =
    sections.find((section) => section.name === 'radar')?.top ?? null

  if (direction > 0) {
    if (
      currentScrollY <
      blogTop - viewportHeight * HOME_SECTION_ENTRY_GAP_VIEWPORTS
    ) {
      return blogTop
    }

    if (
      currentScrollY <
      widgetTop - viewportHeight * HOME_SECTION_ENTRY_GAP_VIEWPORTS
    ) {
      return widgetTop
    }

    if (
      radarTop != null &&
      currentScrollY >=
        radarTop - viewportHeight * HOME_RADAR_SNAP_THRESHOLD_VIEWPORTS &&
      currentScrollY < radarTop
    ) {
      return radarTop
    }

    return null
  }

  if (
    radarTop != null &&
    currentScrollY <=
      radarTop + viewportHeight * HOME_RADAR_RELEASE_THRESHOLD_VIEWPORTS &&
    currentScrollY >
      radarTop - viewportHeight * HOME_SECTION_ENTRY_GAP_VIEWPORTS
  ) {
    return widgetReturnTop
  }

  if (
    currentScrollY <=
      widgetTop + viewportHeight * HOME_SECTION_EXIT_THRESHOLD_VIEWPORTS &&
    currentScrollY >
      widgetTop - viewportHeight * HOME_SECTION_ENTRY_GAP_VIEWPORTS
  ) {
    return blogTop
  }

  if (
    currentScrollY <=
      blogTop + viewportHeight * HOME_SECTION_EXIT_THRESHOLD_VIEWPORTS &&
    currentScrollY > blogTop - viewportHeight * HOME_SECTION_ENTRY_GAP_VIEWPORTS
  ) {
    return heroTop
  }

  return null
}

export function useHomeSectionPager({
  enabled,
  prefersReducedMotion,
}: {
  enabled: boolean
  prefersReducedMotion: boolean
}) {
  const lenis = useLenis()

  useEffect(() => {
    if (
      !enabled ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return
    }

    let isPagerLocked = false
    let unlockTimer = 0
    let pagerSuppressedUntil = 0

    const lockPager = () => {
      isPagerLocked = true
      window.clearTimeout(unlockTimer)
      unlockTimer = window.setTimeout(() => {
        isPagerLocked = false
      }, HOME_SNAP_LOCK_MS)
    }

    const snapToTop = (top: number) => {
      lockPager()

      if (lenis) {
        lenis.scrollTo(top, {
          duration: prefersReducedMotion ? 0 : 0.88,
          immediate: prefersReducedMotion,
          lock: true,
        })
        return
      }

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    }

    const trySnap = (direction: 1 | -1) => {
      if (isPagerLocked) return false
      if (Date.now() < pagerSuppressedUntil) return false

      const viewportHeight = Math.max(1, window.innerHeight)
      const sections = getSnapSections()
      if (sections.length === 0) return false

      const targetTop = getSnapTargetTop(
        window.scrollY,
        direction,
        viewportHeight,
        sections
      )
      if (targetTop == null) return false

      snapToTop(targetTop)
      return true
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return
      if (Math.abs(event.deltaY) < HOME_SNAP_WHEEL_THRESHOLD) return
      if (isElementWithinInteractiveZone(event.target)) return

      const direction = event.deltaY > 0 ? 1 : -1
      if (trySnap(direction)) {
        event.preventDefault()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (isElementWithinInteractiveZone(event.target)) return

      const direction =
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        (event.key === ' ' && !event.shiftKey)
          ? 1
          : event.key === 'ArrowUp' ||
              event.key === 'PageUp' ||
              (event.key === ' ' && event.shiftKey)
            ? -1
            : 0

      if (direction === 0) return
      if (trySnap(direction)) {
        event.preventDefault()
      }
    }

    const handlePagerSuppress = (event: Event) => {
      const detail = (event as CustomEvent<{ durationMs?: number }>).detail
      const durationMs = Math.max(0, detail?.durationMs ?? 0)
      pagerSuppressedUntil = Date.now() + durationMs
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener(
      HOME_PAGER_SUPPRESS_EVENT,
      handlePagerSuppress as EventListener
    )

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener(
        HOME_PAGER_SUPPRESS_EVENT,
        handlePagerSuppress as EventListener
      )
      window.clearTimeout(unlockTimer)
    }
  }, [enabled, lenis, prefersReducedMotion])
}
