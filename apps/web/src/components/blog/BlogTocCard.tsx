import { ArrowUpCircle, MessageSquareText } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { cn } from '@/lib/utils'
import '../../i18n'
import { X } from 'lucide-react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface BlogTocCardProps {
  toc?: TocItem[]
  title?: string
  activeId?: string
  variant?: 'card' | 'plain'
}
interface BlogTocDrawerProps {
  toc?: TocItem[]
  title?: string
  activeId?: string
  open: boolean
  onClose: () => void
}

const styles = {
  tocCard:
    'overflow-visible border-0 p-4 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.45)] dark:border-0',
  tocPlainCard:
    'border-0 bg-transparent p-0 shadow-none backdrop-blur-0 dark:bg-transparent',
  tocHeader:
    'mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-[var(--text-secondary)]',
  tocActions: 'flex items-center gap-2 text-[var(--text-disabled)]',
  tocActionLink: cn(
    'inline-flex transition-colors hover:text-[var(--text-primary)]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60'
  ),
  tocBody: 'relative',
  tocRail: 'relative pl-4',
  tocRailLine:
    'absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-slate-200/80 dark:bg-slate-800/80',
  tocRailIndicator: cn(
    'absolute left-0 h-4 w-[3px] rounded-full bg-blue-600',
    'transition-[top,height,opacity] duration-200 ease-out -translate-y-1/2',
    'dark:bg-blue-400'
  ),
  tocList: 'space-y-1 list-none pl-0',
  tocItemBase: cn(
    'relative block overflow-hidden rounded-md py-1 text-sm leading-5 truncate',
    'cursor-pointer transition-[color,background-color,transform] duration-150'
  ),
  tocItem: cn(
    'text-[var(--text-secondary)] hover:bg-slate-100/65 hover:text-blue-600',
    'dark:hover:bg-slate-800/50 dark:hover:text-blue-400'
  ),
  tocItemActive: cn(
    'bg-blue-50/80 text-blue-600 font-semibold',
    'dark:bg-blue-950/30 dark:text-blue-400'
  ),
  tocLevel1: 'px-2 font-semibold',
  tocLevel2: 'px-2 font-medium',
  tocLevel3: 'px-2',
  tocGroup: 'relative mt-1 list-none rounded-lg py-0.5',
  tocGroupActive: 'bg-slate-50/70 dark:bg-slate-900/35',
  tocChildList: cn(
    'relative mt-1 space-y-0.5 list-none pl-4',
    'before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:rounded-full',
    'before:bg-slate-200 dark:before:bg-slate-700/80'
  ),
  tocChildListActive: 'before:bg-blue-300 dark:before:bg-blue-500/70',
}

function handleLinkClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  id: string,
  text?: string
) {
  e.preventDefault()
  if (id === 'page-top') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.history.pushState({}, '', window.location.pathname)
    return
  }
  const element = document.getElementById(id) || findHeadingByText(text)
  if (element) {
    const top = element.getBoundingClientRect().top + window.scrollY - 100 // Offset for sticky header
    window.scrollTo({ top, behavior: 'smooth' })
    // Update URL hash without scrolling
    window.history.pushState({}, '', `#${id}`)
  }
}

function findHeadingByText(text?: string) {
  if (!text) return null
  const normalized = text.trim()
  if (!normalized) return null

  return (
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'article h1, article h2, article h3'
      )
    ).find((heading) => heading.textContent?.trim() === normalized) ?? null
  )
}

function TocList({
  toc,
  activeId,
  onItemClick,
  title,
}: {
  toc: TocItem[]
  activeId: string
  onItemClick: (id: string) => void
  title?: string
}) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null)
  const [indicatorHeight, setIndicatorHeight] = useState<number>(16)

  type Node = TocItem & { children: Node[] }
  const stack: Node[] = []
  const tree: Node[] = []

  for (const item of toc) {
    const node: Node = { ...item, children: [] }
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      tree.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }

  useLayoutEffect(() => {
    if (!railRef.current) return
    const items = railRef.current.querySelectorAll(
      '[data-toc-id]'
    ) as NodeListOf<HTMLElement>
    const active = railRef.current.querySelector(
      `[data-toc-id="${activeId}"]`
    ) as HTMLElement | null
    if (!active || items.length === 0) return

    const railRect = railRef.current.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const activeCenter = activeRect.top - railRect.top + activeRect.height / 2
    setIndicatorTop(activeCenter)

    const baseHeight = 16
    const first = items[0]
    const last = items[items.length - 1]
    const firstRect = first.getBoundingClientRect()
    const lastRect = last.getBoundingClientRect()
    const firstCenter = firstRect.top - railRect.top + firstRect.height / 2
    const lastCenter = lastRect.top - railRect.top + lastRect.height / 2

    let nextHeight = baseHeight
    if (activeId === first.getAttribute('data-toc-id')) {
      nextHeight = Math.max(baseHeight, firstCenter * 2)
    } else if (activeId === last.getAttribute('data-toc-id')) {
      nextHeight = Math.max(baseHeight, (railRect.height - lastCenter) * 2)
    }
    nextHeight = Math.min(nextHeight, railRect.height)
    setIndicatorHeight(nextHeight)
  }, [activeId, toc, title])

  function containsActive(node: Node): boolean {
    return node.id === activeId || node.children.some(containsActive)
  }

  function linkClassName(node: Node) {
    return cn(
      styles.tocItemBase,
      node.id === activeId ? styles.tocItemActive : styles.tocItem,
      node.level <= 1 && styles.tocLevel1,
      node.level === 2 && styles.tocLevel2,
      node.level >= 3 && styles.tocLevel3
    )
  }

  function render(nodes: Node[]) {
    return nodes.map((n) => {
      const hasChildren = n.children.length > 0
      const isGroupedSection = n.level === 2 && hasChildren
      const isActiveGroup = containsActive(n)

      return (
        <li
          key={n.id}
          className={cn(
            isGroupedSection ? styles.tocGroup : 'list-none',
            isGroupedSection && isActiveGroup && styles.tocGroupActive
          )}
        >
          <a
            href={`#${n.id}`}
            onClick={(e) => {
              onItemClick(n.id)
              handleLinkClick(e, n.id, n.text)
            }}
            data-toc-id={n.id}
            className={linkClassName(n)}
            style={
              !isGroupedSection
                ? { marginLeft: `${Math.max(n.level - 2, 0) * 12}px` }
                : undefined
            }
          >
            {n.text}
          </a>
          {n.children.length > 0 && (
            <ol
              className={cn(
                isGroupedSection
                  ? styles.tocChildList
                  : 'mt-1 list-none space-y-1 pl-0',
                isGroupedSection && isActiveGroup && styles.tocChildListActive
              )}
            >
              {render(n.children)}
            </ol>
          )}
        </li>
      )
    })
  }

  return (
    <div ref={railRef} className={styles.tocRail}>
      <span className={styles.tocRailLine} aria-hidden="true" />
      <span
        className={styles.tocRailIndicator}
        aria-hidden="true"
        style={
          indicatorTop == null
            ? { opacity: 0 }
            : { top: indicatorTop, height: indicatorHeight }
        }
      />
      <ol className="list-none space-y-1 pl-0">
        {title && (
          <li className="list-none">
            <a
              href="#page-top"
              onClick={(e) => {
                onItemClick('page-top')
                handleLinkClick(e, 'page-top', title)
              }}
              data-toc-id="page-top"
              className={cn(
                styles.tocItemBase,
                activeId === 'page-top' ? styles.tocItemActive : styles.tocItem,
                styles.tocLevel1
              )}
            >
              {title}
            </a>
          </li>
        )}
        {render(tree)}
      </ol>
    </div>
  )
}

export function BlogTocCard({
  toc = [],
  title,
  activeId = 'page-top',
  variant = 'card',
}: BlogTocCardProps) {
  const { t } = useTranslation()

  return (
    <Card
      className={cn(styles.tocCard, variant === 'plain' && styles.tocPlainCard)}
    >
      <div className={styles.tocHeader}>
        <span>{t('blog.toc.title')}</span>
        {variant === 'card' ? (
          <div className={styles.tocActions}>
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="#page-top"
                    aria-label={t('blog.toc.backToTop')}
                    className={styles.tocActionLink}
                    onClick={(e) => handleLinkClick(e, 'page-top')}
                  >
                    <ArrowUpCircle size={18} />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow className="text-xs">
                  {t('blog.toc.backToTop')}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="#twikoo"
                    aria-label={t('blog.toc.comments')}
                    className={styles.tocActionLink}
                    onClick={(e) => handleLinkClick(e, 'twikoo')}
                  >
                    <MessageSquareText size={18} />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow className="text-xs">
                  {t('blog.toc.comments')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : null}
      </div>
      <div className={styles.tocBody}>
        <div className={styles.tocList}>
          {toc.length === 0 && !title ? (
            <div className="text-sm text-[var(--text-secondary)]">
              {t('blog.toc.empty')}
            </div>
          ) : (
            <TocList
              toc={toc}
              activeId={activeId}
              onItemClick={() => undefined}
              title={title}
            />
          )}
        </div>
      </div>
    </Card>
  )
}

export function BlogTocDrawer({
  toc = [],
  title,
  activeId = 'page-top',
  open,
  onClose,
}: BlogTocDrawerProps) {
  const { t } = useTranslation()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-transparent',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'backdrop-blur-0 fixed top-[10vh] right-6 z-50 w-[min(82vw,320px)] rounded-2xl bg-white/95 shadow-xl transition-all duration-200',
          'dark:bg-slate-950/95',
          open
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-4 opacity-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] dark:border-slate-800">
          <span>{t('blog.toc.title')}</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-disabled)] transition hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-slate-800"
            aria-label={t('blog.toc.close', 'Close')}
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {toc.length === 0 && !title ? (
            <div className="text-sm text-[var(--text-secondary)]">
              {t('blog.toc.empty')}
            </div>
          ) : (
            <TocList
              toc={toc}
              activeId={activeId}
              onItemClick={() => undefined}
              title={title}
            />
          )}
        </div>
      </div>
    </>
  )
}
