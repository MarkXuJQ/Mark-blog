import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useRef,
} from 'react'
import { usePrefersReducedMotion } from '@/components/ui/text-reveal-block-utils/use-prefers-reduced-motion'
import {
  observeWindowResize,
  waitForScrollerReady,
} from '@/components/ui/text-reveal-block-utils/scroll-trigger-utils'

gsap.registerPlugin(SplitText, ScrollTrigger)

export type TextRevealBlockDirection = 'down' | 'left' | 'right' | 'up'

interface DirectionConfig {
  axis: 'scaleX' | 'scaleY'
  enterOrigin: string
  exitOrigin: string
}

const DIRECTION_CONFIG = {
  down: { axis: 'scaleY', enterOrigin: 'bottom center', exitOrigin: 'top center' },
  left: { axis: 'scaleX', enterOrigin: 'left center', exitOrigin: 'right center' },
  right: { axis: 'scaleX', enterOrigin: 'right center', exitOrigin: 'left center' },
  up: { axis: 'scaleY', enterOrigin: 'top center', exitOrigin: 'bottom center' },
} as const satisfies Record<TextRevealBlockDirection, DirectionConfig>

export interface TextRevealBlockProps {
  animateOnScroll?: boolean
  as?: keyof React.JSX.IntrinsicElements
  blockColor?: string
  children?: ReactNode
  className?: string
  delay?: number
  direction?: TextRevealBlockDirection
  duration?: number
  scroller?: Element | Window
  scrollReadyEvent?: string
  stagger?: number
  text?: string
}

interface LineSetup {
  blocks: HTMLDivElement[]
  lines: Element[]
  splits: SplitText[]
}

interface AnimationOptions {
  animateOnScroll: boolean
  blockColor: string
  container: HTMLElement
  delay: number
  direction: TextRevealBlockDirection
  duration: number
  prefersReducedMotion: boolean
  scroller: Element | Window
  stagger: number
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref && typeof ref === 'object') (ref as { current: T | null }).current = value
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => refs.forEach((ref) => assignRef(ref, node))
}

function getCloneableChild(node: ReactNode): ReactElement | null {
  if (isValidElement(node)) return node

  let found: ReactElement | null = null
  let count = 0
  Children.forEach(node, (child) => {
    if (child == null || child === false) return
    if (typeof child === 'string' && child.trim() === '') return
    if (isValidElement(child)) found = child
    count += 1
  })
  return count === 1 ? found : null
}

function restoreWrappers(container: HTMLElement) {
  for (const wrapper of container.querySelectorAll('.text-reveal-block-line')) {
    const firstChild = wrapper.firstChild
    if (wrapper.parentNode && firstChild) {
      wrapper.parentNode.insertBefore(firstChild, wrapper)
      wrapper.remove()
    }
  }
}

function createCleanup(container: HTMLElement, setup: LineSetup) {
  return () => {
    setup.splits.forEach((split) => split.revert())
    restoreWrappers(container)
  }
}

function setupLineReveal(container: HTMLElement, blockColor: string): LineSetup {
  const splits: SplitText[] = []
  const lines: Element[] = []
  const blocks: HTMLDivElement[] = []
  const elements = container.hasAttribute('data-text-reveal-block-wrapper')
    ? Array.from(container.children)
    : [container]

  for (const element of elements) {
    const split = SplitText.create(element, { type: 'lines', linesClass: 'block-line++', lineThreshold: 0.1 })
    splits.push(split)
    for (const line of split.lines) {
      const parent = line.parentNode
      if (!parent) continue
      const wrapper = document.createElement('div')
      wrapper.className = 'text-reveal-block-line'
      Object.assign(wrapper.style, { position: 'relative', display: 'block', width: 'max-content', maxWidth: '100%', overflow: 'hidden' })
      parent.insertBefore(wrapper, line)
      wrapper.appendChild(line)
      Object.assign((line as HTMLElement).style, { position: 'relative', display: 'block' })
      const block = document.createElement('div')
      block.className = 'text-reveal-block-wipe'
      Object.assign(block.style, { position: 'absolute', top: '0', left: '0', width: '101%', height: '101%', pointerEvents: 'none', willChange: 'transform', zIndex: '1', backgroundColor: blockColor })
      wrapper.appendChild(block)
      lines.push(line)
      blocks.push(block)
    }
  }
  return { splits, lines, blocks }
}

function createBlockRevealTimeline(block: HTMLDivElement, line: Element, index: number, options: AnimationOptions) {
  const { axis, exitOrigin } = DIRECTION_CONFIG[options.direction]
  const timeline = gsap.timeline({
    delay: options.delay + index * options.stagger,
    paused: true,
  })
  timeline.to(block, { [axis]: 1, duration: options.duration, ease: 'power4.inOut' })
  timeline.set(line, { opacity: 1 })
  timeline.set(block, { transformOrigin: exitOrigin })
  timeline.to(block, { [axis]: 0, duration: options.duration, ease: 'power4.inOut' })
  return timeline
}

function playTimelineIfInView(timeline: gsap.core.Timeline, trigger: ScrollTrigger) {
  if (trigger.isActive && timeline.paused()) timeline.play()
}

function refreshScrollRevealTriggers(scrollTriggers: ScrollTrigger[]) {
  ScrollTrigger.refresh()
  scrollTriggers.forEach((trigger) => {
    const timeline = trigger.animation as gsap.core.Timeline | undefined
    if (timeline) playTimelineIfInView(timeline, trigger)
  })
}

function initTextRevealBlock(options: AnimationOptions) {
  const setup = setupLineReveal(options.container, options.blockColor)
  if (options.prefersReducedMotion) {
    gsap.set(setup.lines, { opacity: 1 })
    gsap.set(setup.blocks, { display: 'none' })
    return { cleanup: createCleanup(options.container, setup), scrollTriggers: [] as ScrollTrigger[] }
  }

  const { axis, enterOrigin } = DIRECTION_CONFIG[options.direction]
  gsap.set(setup.lines, { opacity: 0 })
  gsap.set(setup.blocks, { [axis]: 0, transformOrigin: enterOrigin })
  const scrollTriggers: ScrollTrigger[] = []
  setup.blocks.forEach((block, index) => {
    const line = setup.lines[index]
    if (!line) return
    const timeline = createBlockRevealTimeline(block, line, index, options)
    if (options.animateOnScroll) {
      scrollTriggers.push(ScrollTrigger.create({
        trigger: options.container,
        scroller: options.scroller,
        start: 'top 90%',
        once: true,
        animation: timeline,
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          const activeTimeline = self.animation as gsap.core.Timeline | undefined
          if (activeTimeline) playTimelineIfInView(activeTimeline, self)
        },
      }))
    }
  })
  if (scrollTriggers.length > 0) requestAnimationFrame(() => refreshScrollRevealTriggers(scrollTriggers))
  if (!options.animateOnScroll) {
    setup.blocks.forEach((block, index) => {
      const line = setup.lines[index]
      if (line) createBlockRevealTimeline(block, line, index, options).play()
    })
  }
  return { cleanup: createCleanup(options.container, setup), scrollTriggers }
}

export function TextRevealBlock({
  children,
  text,
  as: Component = 'p',
  className,
  animateOnScroll = true,
  delay = 0,
  blockColor = 'var(--foreground)',
  direction = 'left',
  stagger = 0.15,
  duration = 0.75,
  scroller: scrollerProp,
  scrollReadyEvent,
}: TextRevealBlockProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const resolvedChild = children ?? (text ? createElement(Component, { className }, text) : null)

  useGSAP(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    let teardown: (() => void) | undefined
    let scrollTriggers: ScrollTrigger[] = []
    let resizeObserver: ResizeObserver | undefined
    let unbindWindowResize: (() => void) | undefined
    const refreshTriggers = () => scrollTriggers.length > 0 && refreshScrollRevealTriggers(scrollTriggers)
    const onScrollReady = () => refreshTriggers()
    const mountAnimation = async () => {
      if (disposed || !containerRef.current) return
      const scroller = scrollerProp ?? window
      await waitForScrollerReady(scroller, scrollReadyEvent)
      if (disposed || !containerRef.current) return
      const result = initTextRevealBlock({ animateOnScroll, blockColor, container: containerRef.current, delay, direction, duration, prefersReducedMotion, scroller, stagger })
      scrollTriggers = result.scrollTriggers
      teardown = () => {
        scrollTriggers.forEach((trigger) => trigger.kill())
        result.cleanup()
        scrollTriggers = []
      }
      if (scrollTriggers.length > 0) {
        if (scroller instanceof HTMLElement) {
          resizeObserver = new ResizeObserver(refreshTriggers)
          resizeObserver.observe(scroller)
        } else unbindWindowResize = observeWindowResize(refreshTriggers)
      }
    }
    if (scrollReadyEvent) window.addEventListener(scrollReadyEvent, onScrollReady)
    mountAnimation().catch(() => undefined)
    return () => {
      disposed = true
      if (scrollReadyEvent) window.removeEventListener(scrollReadyEvent, onScrollReady)
      resizeObserver?.disconnect()
      unbindWindowResize?.()
      teardown?.()
    }
  }, { scope: containerRef, dependencies: [animateOnScroll, delay, blockColor, direction, stagger, duration, prefersReducedMotion, scrollerProp, scrollReadyEvent] })

  if (!resolvedChild) return null
  const child = getCloneableChild(resolvedChild)
  if (child) {
    return cloneElement(child as ReactElement<{ ref?: Ref<HTMLElement> }>, { ref: mergeRefs(containerRef, (child as ReactElement<{ ref?: Ref<HTMLElement> }>).props.ref) })
  }
  return <div data-text-reveal-block-wrapper="true" ref={containerRef as Ref<HTMLDivElement>}>{resolvedChild}</div>
}

export default TextRevealBlock
