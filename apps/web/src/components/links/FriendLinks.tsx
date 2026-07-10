import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { StaggeredList } from '@/components/ui/StaggeredList'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  FRIEND_LINK_CATEGORY_ORDER,
  FRIEND_LINKS,
  getFriendLinkLabels,
  type FriendLink,
  type FriendLinkCategory,
} from './friendLinksData'

interface FriendLinksProps {
  className?: string
  simple?: boolean
}

const LENS_RADIUS = 168
const SIMPLE_LENS_RADIUS = 132
const LENS_SHIFT_PX = 3.5
const SIMPLE_LENS_SHIFT_PX = 2.5

function getLensEase(value: number) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

function resetFriendLinkLens(node: HTMLAnchorElement) {
  node.style.removeProperty('--friend-link-scale')
  node.style.removeProperty('--friend-link-icon-scale')
  node.style.removeProperty('--friend-link-name-shift')
  node.style.removeProperty('--friend-link-x')
  node.style.removeProperty('--friend-link-y')
  node.style.removeProperty('--friend-link-opacity')
  node.style.removeProperty('--friend-link-saturation')
  node.style.removeProperty('--friend-link-brightness')
  node.style.removeProperty('--friend-link-z')
}

function FriendLinkCard({
  link,
  simple = false,
  className,
  style,
  registerItem,
  onItemFocus,
  onItemBlur,
}: {
  link: FriendLink
  simple?: boolean
  className?: string
  style?: CSSProperties
  registerItem?: (id: string, node: HTMLAnchorElement | null) => void
  onItemFocus?: (node: HTMLAnchorElement) => void
  onItemBlur?: () => void
}) {
  const { i18n } = useTranslation()
  const labels = getFriendLinkLabels(Boolean(i18n.language?.startsWith('zh')))

  return (
    <span className={cn(styles.itemShell, className)} style={style}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            ref={(node) => registerItem?.(link.id, node)}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'group flex min-w-0 items-center',
              simple ? styles.simpleCard : styles.card
            )}
            style={
              {
                transform:
                  'translate3d(var(--friend-link-x, 0px), var(--friend-link-y, 0px), 0) scale(var(--friend-link-scale, 1))',
                zIndex: 'var(--friend-link-z, 1)',
                opacity: 'var(--friend-link-opacity, 1)',
                filter:
                  'saturate(var(--friend-link-saturation, 1)) brightness(var(--friend-link-brightness, 1))',
              } as CSSProperties
            }
            aria-label={`${labels.openLabel}: ${link.name}`}
            onFocus={(event) => onItemFocus?.(event.currentTarget)}
            onBlur={onItemBlur}
          >
            <img
              src={link.faviconSrc}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className={cn(
                styles.faviconImage,
                simple ? styles.simpleFaviconImage : styles.richFaviconImage
              )}
              style={{
                transform: 'scale(var(--friend-link-icon-scale, 1))',
              }}
            />
            <span
              className={styles.linkName}
              style={{
                transform: 'translateX(var(--friend-link-name-shift, 0px))',
              }}
            >
              {link.name}
            </span>
          </a>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={12}
          showArrow
          className={styles.tooltip}
        >
          <span className={styles.tooltipLayer}>
            <span className={styles.tooltipTitle}>{link.name}</span>
            <span className={styles.tooltipUrl}>{link.href}</span>
          </span>
          <span className={styles.tooltipDescription}>
            {link.description}
          </span>
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

function FriendLinkGrid({
  links,
  simple,
  motionIndexOffset,
}: {
  links: FriendLink[]
  simple: boolean
  motionIndexOffset: number
}) {
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const pointerRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)

  const updateLens = useCallback(
    (x: number, y: number) => {
      const radius = simple ? SIMPLE_LENS_RADIUS : LENS_RADIUS
      const maxShift = simple ? SIMPLE_LENS_SHIFT_PX : LENS_SHIFT_PX

      Object.values(itemRefs.current).forEach((node) => {
        if (!node) return

        const rect = node.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const deltaX = centerX - x
        const deltaY = centerY - y
        const distance = Math.hypot(deltaX, deltaY)
        const rawInfluence = Math.max(0, 1 - distance / radius)
        const influence = getLensEase(rawInfluence)
        const isActive =
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

        if (influence <= 0.01 && !isActive) {
          resetFriendLinkLens(node)
          return
        }

        const directionX = distance > 0 ? deltaX / distance : 0
        const directionY = distance > 0 ? deltaY / distance : -1
        const activeBoost = isActive ? 1 : 0
        const scale =
          1 + influence * (simple ? 0.055 : 0.07) + activeBoost * 0.035
        const iconScale =
          1 + influence * (simple ? 0.065 : 0.08) + activeBoost * 0.045
        const shift = influence * maxShift

        node.style.setProperty('--friend-link-scale', scale.toFixed(3))
        node.style.setProperty('--friend-link-icon-scale', iconScale.toFixed(3))
        node.style.setProperty(
          '--friend-link-name-shift',
          `${(influence * 1.1 + activeBoost * 0.6).toFixed(2)}px`
        )
        node.style.setProperty(
          '--friend-link-x',
          `${(directionX * shift).toFixed(2)}px`
        )
        node.style.setProperty(
          '--friend-link-y',
          `${(directionY * shift - activeBoost * 0.6).toFixed(2)}px`
        )
        node.style.setProperty(
          '--friend-link-opacity',
          (0.98 + influence * 0.02).toFixed(3)
        )
        node.style.setProperty(
          '--friend-link-saturation',
          (1 + influence * 0.08).toFixed(3)
        )
        node.style.setProperty(
          '--friend-link-brightness',
          (1 + influence * 0.03).toFixed(3)
        )
        node.style.setProperty(
          '--friend-link-z',
          String(Math.round(1 + influence * 10 + activeBoost * 10))
        )
      })
    },
    [simple]
  )

  const resetLens = useCallback(() => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    Object.values(itemRefs.current).forEach((node) => {
      if (node) resetFriendLinkLens(node)
    })
  }, [])

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.pointerType === 'touch' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia('(pointer: coarse)').matches
      ) {
        return
      }

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      }

      if (frameRef.current == null) {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null
          updateLens(pointerRef.current.x, pointerRef.current.y)
        })
      }
    },
    [updateLens]
  )

  const handleItemFocus = useCallback(
    (node: HTMLAnchorElement) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const rect = node.getBoundingClientRect()
      updateLens(rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    [updateLens]
  )

  const registerItem = useCallback(
    (id: string, node: HTMLAnchorElement | null) => {
      if (!node) {
        delete itemRefs.current[id]
        return
      }

      itemRefs.current[id] = node
    },
    []
  )

  useEffect(() => resetLens, [resetLens])

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={80}>
      <div
        className={styles.gridField}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetLens}
        onPointerCancel={resetLens}
      >
        <StaggeredList
          className={cn(simple ? styles.simpleGrid : styles.grid)}
          startIndex={motionIndexOffset}
        >
          {links.map((link) => (
            <FriendLinkCard
              key={link.id}
              link={link}
              simple={simple}
              registerItem={registerItem}
              onItemFocus={handleItemFocus}
              onItemBlur={resetLens}
            />
          ))}
        </StaggeredList>
      </div>
    </TooltipProvider>
  )
}

function FriendLinkSection({
  category,
  links,
  simple = false,
  motionIndexOffset = 0,
}: {
  category: FriendLinkCategory
  links: FriendLink[]
  simple?: boolean
  motionIndexOffset?: number
}) {
  const { i18n } = useTranslation()
  const labels = getFriendLinkLabels(Boolean(i18n.language?.startsWith('zh')))

  return (
    <section className={cn(simple ? 'space-y-3' : 'space-y-4')}>
      <div
        className={cn(
          'flex items-baseline justify-between gap-4',
          simple ? styles.simpleSectionHeader : styles.sectionHeader
        )}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {labels.categories[category]}
        </h2>
        <span
          className={cn(
            'font-medium text-slate-400 dark:text-slate-500',
            simple ? 'text-xs' : 'text-sm'
          )}
        >
          {String(links.length).padStart(2, '0')}
        </span>
      </div>
      {links.length > 0 ? (
        <FriendLinkGrid
          links={links}
          simple={simple}
          motionIndexOffset={motionIndexOffset}
        />
      ) : (
        <p
          className={cn(
            'text-sm leading-6 text-slate-500 dark:text-slate-400',
            simple ? 'py-2' : styles.emptyState
          )}
        >
          {labels.emptyNeighbors}
        </p>
      )}
    </section>
  )
}

const styles = {
  itemShell: 'block min-w-0',
  gridField: 'relative overflow-visible [perspective:900px]',
  card: cn(
    'relative h-12 w-full origin-center gap-2.5 rounded-lg px-1.5 text-slate-700 transform-gpu will-change-[transform,opacity,filter]',
    'transition-[color,opacity,filter,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
    'hover:-translate-y-px hover:text-[color-mix(in_srgb,var(--brand-600)_82%,var(--text-primary)_18%)]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-background)]',
    'dark:text-slate-300 dark:hover:text-[color-mix(in_srgb,var(--brand-400)_82%,var(--text-primary)_18%)]'
  ),
  simpleCard:
    'relative h-11 w-full origin-center gap-2 rounded-lg px-1 text-[var(--text-secondary)] transform-gpu will-change-[transform,opacity,filter] transition-[color,opacity,filter,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-background)]',
  faviconImage:
    'shrink-0 rounded-[7px] object-contain transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
  richFaviconImage: 'h-8 w-8',
  simpleFaviconImage: 'h-7 w-7',
  linkName:
    'min-w-0 truncate text-sm font-semibold leading-none tracking-normal transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
  grid: 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] gap-x-3 gap-y-2',
  sectionHeader: cn(
    'relative pb-4',
    'after:absolute after:bottom-0 after:left-0 after:h-1 after:w-12 after:rounded-full after:bg-[color-mix(in_srgb,var(--brand-500)_72%,transparent)] after:content-[""]',
    'before:absolute before:bottom-0 before:left-14 before:h-1 before:w-2 before:rounded-full before:bg-[color-mix(in_srgb,var(--brand-500)_28%,transparent)] before:content-[""]'
  ),
  simpleSectionHeader: 'pb-1',
  simpleGrid:
    'grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.75rem),1fr))] gap-x-3 gap-y-1.5',
  tooltipLayer:
    'block rounded-md bg-slate-50/90 px-2.5 py-2 ring-1 ring-slate-900/5 dark:bg-[#202328] dark:ring-white/5',
  tooltipTitle:
    'block truncate text-sm font-semibold text-slate-900 dark:text-slate-100',
  tooltipUrl:
    'mt-1 block break-all font-mono text-[11px] leading-4 text-slate-500 dark:text-slate-400',
  tooltipDescription:
    'block px-1.5 pb-0.5 pt-2 text-xs leading-5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]',
  tooltip:
    'friend-link-tooltip max-w-[20rem] rounded-lg !border-slate-200/70 !bg-white/95 p-1.5 !text-[var(--text-primary)] !shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] !ring-1 !ring-slate-900/5 dark:!border-0 dark:!bg-[#17191c] dark:!shadow-none dark:!ring-white/5',
  emptyState:
    'rounded-xl border border-slate-200/70 bg-white/80 px-4 py-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur dark:border-0 dark:bg-[#17191c] dark:shadow-none',
}

export function FriendLinks({ className, simple = false }: FriendLinksProps) {
  let motionIndexOffset = 0
  const groupedLinks = FRIEND_LINK_CATEGORY_ORDER.map((category) => {
    const links = FRIEND_LINKS.filter((link) => link.category === category)
    const group = {
      category,
      links,
      motionIndexOffset,
    }
    motionIndexOffset += links.length
    return group
  })

  return (
    <div className={cn(simple ? 'space-y-9' : 'space-y-10', className)}>
      {groupedLinks.map(({ category, links, motionIndexOffset }) => (
        <FriendLinkSection
          key={category}
          category={category}
          links={links}
          simple={simple}
          motionIndexOffset={motionIndexOffset}
        />
      ))}
    </div>
  )
}
