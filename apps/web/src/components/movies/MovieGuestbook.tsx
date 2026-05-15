import { MessageSquareQuote } from 'lucide-react'
import { DeferredComments } from '@/components/comments/DeferredComments'
import { cn } from '@/lib/utils'

interface MovieGuestbookProps {
  locale: string
}

export function MovieGuestbook({ locale }: MovieGuestbookProps) {
  const isZh = locale.startsWith('zh')
  const copy = isZh
    ? {
        eyebrow: 'Visitor Picks',
        title: '片单留言',
        description:
          '有想安利的电影、剧集或导演，可以在这里丢一句。',
        hint: '推荐、吐槽、补片提醒都可以。',
      }
    : {
        eyebrow: 'Visitor Picks',
        title: 'Movie Notes',
        description:
          'Drop a film, show, or director you recommend here.',
        hint: 'Recommendations, quick takes, and watchlist nudges are welcome.',
      }

  return (
    <section
      className={cn(
        'relative mt-5 overflow-hidden rounded-[1.75rem] border p-5',
        'border-slate-200/80 bg-white/72 shadow-[0_24px_56px_-36px_rgba(15,23,42,0.35)] backdrop-blur',
        'dark:border-[#2b2f36] dark:bg-[#17191c]/92 dark:shadow-[0_28px_56px_-34px_rgba(0,0,0,0.5)]'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#ff5941] text-white shadow-[0_12px_28px_-18px_rgba(255,89,65,0.95)]"
      >
        <MessageSquareQuote size={17} strokeWidth={1.9} />
      </div>

      <div className="relative">
        <div className="mb-3 pr-11">
          <div className="min-w-0">
            <div className="mb-2 text-[0.68rem] font-medium tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
              {copy.eyebrow}
            </div>
            <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {copy.title}
            </h2>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {copy.description}
        </p>
        <p className="mt-2 border-l-2 border-slate-200/80 pl-3 text-xs leading-5 text-slate-500 dark:border-[#2b2f36] dark:text-slate-400">
          {copy.hint}
        </p>

        <DeferredComments
          containerId="twikoo-movie-guestbook"
          path="/movies/guestbook"
          rootMargin="480px 0px"
          layout="stacked"
          variant="compact"
          className="mt-4 mb-0"
        />
      </div>
    </section>
  )
}
