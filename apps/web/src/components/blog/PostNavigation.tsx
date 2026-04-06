import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BlogPost } from '../../types'

interface PostNavigationProps {
  prev?: BlogPost
  next?: BlogPost
}

type Direction = 'prev' | 'next'

function handleCardMouseEnter(event: MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.transform =
    'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(-2px)'
}

function handleCardMouseMove(event: MouseEvent<HTMLAnchorElement>) {
  const card = event.currentTarget
  const rect = card.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  const rotateY = (x - 0.5) * 8.5
  const rotateX = (0.5 - y) * 8.5

  card.style.transform =
    `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`
}

function handleCardMouseLeave(event: MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.style.transform = ''
}

function NavigationCard({
  post,
  direction,
}: {
  post: BlogPost
  direction: Direction
}) {
  const isPrev = direction === 'prev'
  const ArrowIcon = isPrev ? ChevronLeft : ChevronRight

  return (
    <Link
      to={`/blog/${post.slug}`}
      onMouseEnter={handleCardMouseEnter}
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      className={[
        'group relative overflow-hidden rounded-[1.75rem] p-5 shadow-[0_20px_32px_-24px_rgba(15,23,42,0.28),0_2px_0_rgba(255,255,255,0.92)_inset,0_-2px_0_rgba(148,163,184,0.14)_inset]',
        'bg-slate-100/88 dark:bg-[#20242a]',
        'transition-[transform,box-shadow,background-color] duration-200 ease-out will-change-transform',
        'hover:bg-slate-100 dark:hover:bg-[#23282f]',
        'hover:shadow-[0_16px_26px_-18px_rgba(15,23,42,0.22),0_2px_0_rgba(255,255,255,0.94)_inset,0_-2px_0_rgba(148,163,184,0.16)_inset]',
        'dark:shadow-[0_24px_36px_-24px_rgba(0,0,0,0.58),0_-2px_0_rgba(0,0,0,0.20)_inset]',
        'dark:hover:shadow-[0_18px_28px_-18px_rgba(0,0,0,0.62),0_-2px_0_rgba(0,0,0,0.24)_inset]',
        isPrev ? 'pl-16 text-left' : 'pr-16 text-right',
      ].join(' ')}
    >
      <div
        className={[
          'pointer-events-none absolute inset-0 rounded-[inherit]',
          isPrev
            ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_38%)] dark:bg-[linear-gradient(135deg,rgba(0,0,0,0.14),transparent_42%)]'
            : 'bg-[linear-gradient(225deg,rgba(255,255,255,0.42),transparent_38%)] dark:bg-[linear-gradient(225deg,rgba(0,0,0,0.14),transparent_42%)]',
        ].join(' ')}
      />
      <span
        className={[
          'absolute top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full',
          'bg-white/80 text-slate-500 shadow-[0_8px_16px_-12px_rgba(15,23,42,0.35)]',
          'transition-[transform,color,background-color] duration-200 group-hover:bg-white group-hover:text-slate-700',
          'dark:bg-[#171b20] dark:text-slate-300 dark:shadow-[0_8px_16px_-12px_rgba(0,0,0,0.45)] dark:group-hover:bg-[#1b2026] dark:group-hover:text-slate-100',
          isPrev ? 'left-4 group-hover:-translate-x-0.5' : 'right-4 group-hover:translate-x-0.5',
        ].join(' ')}
      >
        <ArrowIcon size={17} />
      </span>
      <div className="relative space-y-1.5">
        <span className="line-clamp-2 text-[1.02rem] font-semibold leading-6 text-slate-900 transition-colors group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
          {post.title}
        </span>
        <time className="block text-xs tracking-[0.08em] text-slate-500 dark:text-slate-400">
          {post.date}
        </time>
      </div>
    </Link>
  )
}

export function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null

  return (
    <nav className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
      {prev ? <NavigationCard post={prev} direction="prev" /> : <div />}
      {next ? <NavigationCard post={next} direction="next" /> : <div />}
    </nav>
  )
}
