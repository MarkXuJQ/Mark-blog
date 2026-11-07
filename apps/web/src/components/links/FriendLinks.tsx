import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import { BiCommentDetail } from 'react-icons/bi'
import { StaggeredList } from '@/components/ui/StaggeredList'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/classNames'
import {
  FRIEND_LINK_CATEGORY_ORDER,
  FRIEND_LINKS,
  getFriendLinkByHref,
  getFriendLinkLabels,
  type FriendLink,
  type FriendLinkCategory,
} from '@/lib/links/friendLinksData'
import lostFriendsData from '@/data/lost-friends.json'

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
              referrerPolicy="no-referrer"
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
          <FriendLinkTooltipDetail
            avatarSrc={link.faviconSrc}
            name={link.name}
            url={link.href}
            description={link.description}
            comment={link.comment}
          />
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

function FriendLinkTooltipDetail({
  avatarSrc,
  name,
  url,
  description,
  comment,
}: {
  avatarSrc?: string
  name: string
  url: string
  description?: string
  comment?: string
}) {
  const showPlaceholder = !avatarSrc
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className={styles.tooltipDetail}>
      <div className={styles.tooltipAvatarShell}>
        {showPlaceholder ? (
          <span className={styles.tooltipAvatarPlaceholder}>
            {name.charAt(0)}
          </span>
        ) : (
          <img
            src={avatarSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={styles.tooltipAvatar}
          />
        )}
      </div>
      <div className={styles.tooltipBody}>
        <span className={styles.tooltipName}>{name}</span>
        <span className={styles.tooltipUrl}>{displayUrl}</span>
        {description ? (
          <span className={styles.tooltipDescription}>{description}</span>
        ) : null}
        {comment ? (
          <span className={styles.tooltipComment}>
            <BiCommentDetail className={styles.tooltipCommentIcon} aria-hidden="true" />
            <span className={styles.tooltipCommentText}>{comment}</span>
          </span>
        ) : null}
      </div>
    </div>
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
  tooltipDetail:
    'flex items-start gap-3',
  tooltipAvatarShell:
    'relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/10 dark:bg-[#23262b] dark:ring-white/10',
  tooltipAvatar:
    'absolute inset-0 h-full w-full object-cover',
  tooltipAvatarPlaceholder:
    'absolute inset-0 flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400 dark:text-slate-500',
  tooltipBody:
    'flex min-w-0 flex-1 flex-col gap-1',
  tooltipName:
    'block text-[15px] font-semibold leading-5 text-slate-900 dark:text-slate-100',
  tooltipDescription:
    'block text-xs leading-5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]',
  tooltipComment:
    'flex items-start gap-1.5 rounded-md bg-slate-100/80 px-3 py-1.5 text-xs leading-5 text-[var(--text-primary)] dark:bg-[#23262b]/70 dark:text-[var(--text-primary)]',
  tooltipCommentIcon:
    'mt-0.5 h-4 w-4 shrink-0 text-slate-900 dark:text-slate-100',
  tooltipCommentText:
    'min-w-0 flex-1',
  tooltipUrl:
    'block truncate font-mono text-[11px] leading-4 text-slate-400 dark:text-slate-500',
  tooltip:
    'friend-link-tooltip max-w-[22rem] rounded-xl !border-slate-200/70 !bg-white/95 p-3 !text-[var(--text-primary)] !shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)] !ring-1 !ring-slate-900/5 dark:!border-0 dark:!bg-[#17191c] dark:!shadow-none dark:!ring-white/5',
  emptyState:
    'rounded-xl border border-slate-200/70 bg-white/80 px-4 py-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] backdrop-blur dark:border-0 dark:bg-[#17191c] dark:shadow-none',
  archivedGrid: 'mt-1',
  archivedCard:
    'opacity-70 saturate-50 hover:opacity-100 hover:saturate-100',
  archivedDot:
    'mr-2 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-400 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]',
  archivedName:
    'text-slate-500 line-through decoration-slate-400/70 decoration-1 dark:text-slate-400',
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
    <TooltipProvider delayDuration={120} skipDelayDuration={80}>
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
        <ArchivedFriendsSection simple={simple} />
      </div>
    </TooltipProvider>
  )
}

interface ArchivedFriend {
  id: string
  category: string
  name: string
  url: string
  description?: string
  httpStatus?: number | null
}

function ArchivedFriendsSection({ simple = false }: { simple?: boolean }) {
  const { i18n } = useTranslation()
  const isZh = Boolean(i18n.language?.startsWith('zh'))
  const labels = getFriendLinkLabels(isZh)
  const archived =
    lostFriendsData.archived as unknown as ArchivedFriend[]

  return (
    <section className={cn(simple ? 'space-y-3' : 'space-y-4')}>
      <ArchivedSectionHeader
        simple={simple}
        labels={labels}
        count={archived.length}
      />
      {labels.checkedAtNote ? (
        <p
          className={cn(
            'text-xs text-slate-400 dark:text-slate-500',
            simple ? 'px-0.5' : ''
          )}
        >
          {labels.checkedAtNote}
        </p>
      ) : null}
      {archived.length === 0 ? (
        <p
          className={cn(
            'text-sm leading-6 text-slate-500 dark:text-slate-400',
            simple ? 'py-2' : styles.emptyState
          )}
        >
          {labels.archivedEmpty}
        </p>
      ) : (
        <div
          className={cn(
            simple ? styles.simpleGrid : styles.grid,
            styles.archivedGrid
          )}
        >
          {archived.map((entry) => (
            <ArchivedFriendCard key={entry.id} entry={entry} simple={simple} />
          ))}
        </div>
      )}
    </section>
  )
}

function ArchivedSectionHeader({
  simple,
  labels,
  count,
}: {
  simple: boolean
  labels: ReturnType<typeof getFriendLinkLabels>
  count: number
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4',
        simple ? styles.simpleSectionHeader : styles.sectionHeader
      )}
    >
      <h2
        className={cn(
          'flex items-center gap-2 text-xl font-bold',
          simple
            ? 'text-[var(--text-primary)]'
            : 'text-slate-900 dark:text-slate-100'
        )}
      >
        <WifiOff
          className={cn(
            'h-5 w-5',
            simple ? 'text-[var(--text-secondary)]' : 'text-slate-400 dark:text-slate-500'
          )}
          aria-hidden="true"
        />
        {labels.archivedTitle}
      </h2>
      <span
        className={cn(
          'font-medium text-slate-400 dark:text-slate-500',
          simple ? 'text-xs' : 'text-sm'
        )}
      >
        {labels.archivedCount(count)}
      </span>
    </div>
  )
}

function ArchivedFriendCard({
  entry,
  simple,
}: {
  entry: ArchivedFriend
  simple: boolean
}) {
  const { i18n } = useTranslation()
  const labels = getFriendLinkLabels(Boolean(i18n.language?.startsWith('zh')))
  const fullLink = getFriendLinkByHref(entry.url)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'group flex min-w-0 items-center',
            simple
              ? cn(styles.simpleCard, styles.archivedCard)
              : cn(styles.card, styles.archivedCard)
          )}
          aria-label={`${labels.openLabel}: ${entry.name} (${labels.archivedTitle})`}
        >
          <span className={styles.archivedDot} aria-hidden="true" />
          <span className={cn(styles.linkName, styles.archivedName)}>
            {entry.name}
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
        <FriendLinkTooltipDetail
          avatarSrc={fullLink?.faviconSrc}
          name={entry.name}
          url={entry.url}
          description={entry.description}
          comment={fullLink?.comment}
        />
      </TooltipContent>
    </Tooltip>
  )
}
