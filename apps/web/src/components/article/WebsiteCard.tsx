import { ExternalLink, Globe } from 'lucide-react'
import { cn } from '@/lib/classNames'
import {
  getWebsiteScreenshotUrl,
  resolveWebsiteCard,
  type WebsiteCardInput,
} from '@/lib/article/websiteCardModel'

interface WebsiteCardProps extends WebsiteCardInput {
  className?: string
  showScreenshot?: boolean
  variant?: 'vertical' | 'horizontal' | 'compact'
}

export function WebsiteCard({
  url,
  title,
  description,
  className,
  showScreenshot = true,
  variant = 'vertical',
}: WebsiteCardProps) {
  const model = resolveWebsiteCard({ url, title, description })
  if (!model) return null

  const {
    description: resolvedDescription,
    hostname,
    title: resolvedTitle,
    url: resolvedUrl,
  } = model

  if (variant === 'compact') {
    return (
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] transition-all hover:border-slate-300 hover:shadow-md dark:border-0 dark:bg-[#17191c] dark:shadow-none',
          className
        )}
      >
        {showScreenshot && (
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
            <img
              src={getWebsiteScreenshotUrl(resolvedUrl, 200)}
              alt={`Screenshot of ${resolvedTitle}`}
              width={48}
              height={48}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            <span className="truncate">{resolvedTitle}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Globe className="h-3 w-3" />
            <span className="truncate">{hostname}</span>
          </div>
        </div>
      </a>
    )
  }

  // Both card sizes now share the same image-first treatment: the screenshot
  // fills the frame and the copy sits on a shadowed bottom scrim.
  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${resolvedTitle} · ${hostname}`}
      className={cn(
        'group relative block overflow-hidden rounded-xl bg-slate-900 text-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.7)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e98ba]',
        variant === 'horizontal'
          ? 'aspect-[16/10] sm:aspect-[2.2/1]'
          : 'aspect-[16/10]',
        className
      )}
    >
      {showScreenshot && (
        <>
          <img
            src={getWebsiteScreenshotUrl(resolvedUrl, 800)}
            alt={`Screenshot of ${resolvedTitle}`}
            width={800}
            height={500}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_12px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          <Globe className="h-3.5 w-3.5" />
          <span className="truncate">{hostname}</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-white">
          <span className="line-clamp-2">{resolvedTitle}</span>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 -translate-y-0.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {resolvedDescription && (
          <p className="mt-1.5 line-clamp-2 text-sm text-white/80">
            {resolvedDescription}
          </p>
        )}
      </div>
    </a>
  )
}
