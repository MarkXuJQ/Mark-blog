import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { RiLinksLine } from 'react-icons/ri'
import { StaggeredList } from '@/components/ui/StaggeredList'
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

function FriendLinkCard({
  link,
  simple = false,
  className,
  style,
}: {
  link: FriendLink
  simple?: boolean
  className?: string
  style?: CSSProperties
}) {
  const { i18n } = useTranslation()
  const labels = getFriendLinkLabels(Boolean(i18n.language?.startsWith('zh')))

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex min-w-0 items-start',
        simple ? styles.simpleCard : styles.card,
        className
      )}
      style={style}
      aria-label={`${labels.openLabel}: ${link.name}`}
    >
      <span
        className={cn(
          styles.faviconFrame,
          simple ? styles.simpleFaviconFrame : styles.richFaviconFrame
        )}
      >
        <img
          src={link.faviconSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={cn('object-contain', simple ? 'h-5 w-5' : 'h-7 w-7')}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-500 dark:text-slate-100 dark:group-hover:text-blue-400">
            {link.name}
          </span>
          {!simple ? (
            <RiLinksLine
              size={15}
              className="shrink-0 text-slate-300 transition-colors group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span
          className={cn(
            'mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-400',
            !simple && 'line-clamp-2'
          )}
        >
          {link.description}
        </span>
      </span>
    </a>
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
        <StaggeredList
          className={cn(
            simple
              ? styles.simpleGrid
              : 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3'
          )}
          startIndex={motionIndexOffset}
        >
          {links.map((link) => (
            <FriendLinkCard key={link.id} link={link} simple={simple} />
          ))}
        </StaggeredList>
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
  card: cn(
    'gap-3 rounded-xl border border-slate-200/70 bg-white/75 p-4 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)]',
    'transition-[background-color,box-shadow,transform]',
    'hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_1px_0_rgba(59,130,246,0.16),0_16px_34px_rgba(15,23,42,0.10)]',
    'dark:border-0 dark:bg-[#17191c] dark:shadow-none dark:hover:bg-[#1d2025]'
  ),
  simpleCard:
    'grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)]',
  faviconFrame:
    'mt-0.5 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-slate-900',
  richFaviconFrame: 'h-12 w-12 shadow-none',
  simpleFaviconFrame: 'h-9 w-9',
  sectionHeader: cn(
    'relative pb-4',
    'after:absolute after:bottom-0 after:left-0 after:h-1 after:w-12 after:rounded-full after:bg-blue-500/70 after:content-[""]',
    'before:absolute before:bottom-0 before:left-14 before:h-1 before:w-2 before:rounded-full before:bg-blue-500/25 before:content-[""]'
  ),
  simpleSectionHeader: 'pb-1',
  simpleGrid: 'space-y-0',
  emptyState:
    'rounded-xl border border-slate-200/70 bg-slate-50/80 px-4 py-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:bg-slate-900/30 dark:shadow-none',
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
