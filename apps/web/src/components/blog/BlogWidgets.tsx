import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchTriggerInput } from '../search/SearchTriggerInput'
import { Card } from '../ui/Card'
import { cn } from '../../utils/cn'
import { getImageUrl } from '../../utils/image'
import { Link } from 'react-router-dom'
import { Calendar, Clock, FileText, Activity, Hash, Layers } from 'lucide-react'
import { LuGithub } from 'react-icons/lu'
import { RiBilibiliLine, RiTwitterXFill, RiInstagramLine } from 'react-icons/ri'
import type { BlogPost } from '../../types'
import { countWords } from '../../utils/readingTime'

// --- Profile Content (Internal) ---
function ProfileContent() {
  const { t, i18n } = useTranslation()
  const signatureOptions = useMemo(
    () => [
      t('blog.sidebar.profile.signature'),
      i18n.language?.startsWith('zh')
        ? '光阴分百份，此周占二分。\n五十二之一，逝水不重温。'
        : 'One of fifty-two, two percent of the year,\nGone with the flow, and never reappear.',
      i18n.language?.startsWith('zh')
        ? '衣沾不足惜\n但使愿无违'
        : 'If my dress is wet, what do I care\nAs long as my wish is fulfilled there.',
    ],
    [i18n.language, t]
  )
  const [signatureIndex, setSignatureIndex] = useState(() =>
    signatureOptions.length > 0
      ? Math.floor(Math.random() * signatureOptions.length)
      : 0
  )
  const signature = signatureOptions[signatureIndex] ?? signatureOptions[0] ?? ''
  const normalizedSignature = (() => {
    if (signature.includes('\n')) return signature

    if (signature.includes('乔装成大神改简历')) {
      return signature.replace('乔装成大神改简历', '\n乔装成大神改简历')
    }

    if (/resume/i.test(signature)) {
      return signature.replace(/resume/gi, '\n$&')
    }

    return signature
  })()
  const signatureLines = normalizedSignature
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <>
      <div className={styles.profileContainer}>
        <div className={styles.profileBackdropImage} aria-hidden="true" />
        <div className={styles.profileTextScrim} aria-hidden="true" />
        <div className={styles.avatarWrapper}>
          <img
            src={getImageUrl('/images/IMG_1766.JPG')}
            alt="Profile Avatar"
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className={styles.avatar}
          />
        </div>
        <h3 className={styles.profileName}>Mark Xu</h3>
        <button
          type="button"
          className={styles.profileSignatureButton}
          onClick={() => {
            if (signatureOptions.length <= 1) return
            setSignatureIndex((prev) => (prev + 1) % signatureOptions.length)
          }}
          aria-label="切换口号"
        >
          <p className={styles.profileSignature}>
            {signatureLines.map((line, index) => (
              <span key={`${line}-${index}`} className="block">
                {line}
              </span>
            ))}
          </p>
        </button>
      </div>

      <SearchTriggerInput
        placeholder={t('blog.sidebar.search.placeholder')}
        containerClassName="relative -mt-5 mb-7"
      />

      <SocialLinks />
    </>
  )
}

// --- Social Links (Single function as requested) ---
function SocialLinks() {
  return (
    <div className={styles.socialRow}>
      <a
        href="https://github.com/MarkXuJQ"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.socialBtn}
        aria-label="GitHub"
      >
        <LuGithub size={20} />
        <span className="sr-only">GitHub</span>
      </a>
      <a
        href="https://space.bilibili.com/351772037"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.socialBtn}
        aria-label="Bilibili"
      >
        <RiBilibiliLine size={20} />
        <span className="sr-only">Bilibili</span>
      </a>
      <a
        href="https://x.com/MXu269/articles"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.socialBtn}
        aria-label="X (Twitter)"
      >
        <RiTwitterXFill size={20} />
        <span className="sr-only">X (Twitter)</span>
      </a>
      <a
        href="https://www.instagram.com/mark_xu269/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.socialBtn}
        aria-label="Instagram"
      >
        <RiInstagramLine size={20} />
        <span className="sr-only">Instagram</span>
      </a>
    </div>
  )
}

// --- Profile Widget (Wrapper for backward compatibility if needed) ---
export function ProfileWidget() {
  return (
    <Card as="aside" className={styles.widgetCard}>
      <ProfileContent />
    </Card>
  )
}

// --- Archive Content (Internal) ---
function ArchiveContent() {
  const { t } = useTranslation()

  return (
    <>
      <Link to="/blog" className={cn(styles.widgetHeader, 'mb-4')}>
        <FileText size={20} className="text-blue-500" />
        <h3 className={styles.widgetTitle}>{t('nav.blog')}</h3>
      </Link>
      <Link to="/archive" className={styles.widgetHeader}>
        <Layers size={20} className="text-blue-500" />
        <h3 className={styles.widgetTitle}>
          {t('blog.sidebar.archive.title')}
        </h3>
      </Link>
    </>
  )
}

// --- Archive Widget (Wrapper) ---
export function ArchiveWidget() {
  return (
    <Card as="aside" className={styles.widgetCard}>
      <ArchiveContent />
    </Card>
  )
}

// --- Combined Left Sidebar Widget ---
export function LeftSidebarWidget() {
  return (
    <Card as="aside" className={styles.widgetCard}>
      <ProfileContent />
      <div className="my-6 border-t border-slate-100 dark:border-slate-800" />
      <ArchiveContent />
    </Card>
  )
}

// --- Stats Widget ---
interface StatsWidgetProps {
  posts: BlogPost[]
}

export function StatsWidget({ posts }: StatsWidgetProps) {
  const { t } = useTranslation()

  // Calculate stats
  const totalPosts = posts.length

  const totalWords = posts.reduce((acc, post) => {
    // Assuming post.content is HTML string
    return acc + countWords(post.content)
  }, 0)

  const siteStartDateString =
    import.meta.env.VITE_SITE_START_DATE || '2026-02-27'
  const startDate = new Date(siteStartDateString)
  startDate.setHours(0, 0, 0, 0)

  const runningDays = Math.max(
    0,
    Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)
  )

  const lastUpdatedString =
    posts.length > 0
      ? new Date(
          posts
            .map((p) => {
              const dateString = p.updated || p.date
              return { dateString, time: new Date(dateString).getTime() }
            })
            .reduce((latest, cur) => (cur.time > latest.time ? cur : latest))
            .dateString
        ).toLocaleDateString('zh-CN')
      : siteStartDateString

  return (
    <Card as="aside" className={styles.widgetCard}>
      <div className={styles.widgetHeader}>
        <Activity size={20} className="text-green-500" />
        <h3 className={styles.widgetTitle}>{t('blog.sidebar.stats.title')}</h3>
      </div>

      <div className={styles.statsGrid}>
        <StatItem
          icon={<Clock size={16} />}
          label={t('blog.sidebar.stats.runningTime')}
          value={`${runningDays} ${t('blog.sidebar.stats.days')}`}
        />
        <StatItem
          icon={<FileText size={16} />}
          label={t('blog.sidebar.stats.articleCount')}
          value={totalPosts}
        />
        <StatItem
          icon={<Hash size={16} />}
          label={t('blog.sidebar.stats.wordCount')}
          value={(totalWords / 1000).toFixed(1) + 'k'}
        />
        <StatItem
          icon={<Calendar size={16} />}
          label={t('blog.sidebar.stats.lastUpdate')}
          value={lastUpdatedString}
        />
      </div>
    </Card>
  )
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className={styles.statItem}>
      <div className={styles.statIconWrapper}>{icon}</div>
      <div className={styles.statContent}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  )
}

const styles = {
  widgetCard: 'p-6 transition-all hover:shadow-md',

  // Profile
  profileContainer:
    'relative -mx-6 -mt-6 mb-1 flex flex-col items-center overflow-hidden px-6 pt-6 pb-4 text-center',
  profileBackdropImage:
    "absolute inset-x-0 top-0 z-0 h-[15rem] rounded-t-2xl bg-[image:url('/images/day-640.avif')] bg-cover bg-center blur-[1.5px] scale-[1.02] [mask-image:linear-gradient(to_bottom,black_0%,black_58%,rgba(0,0,0,0.82)_72%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_58%,rgba(0,0,0,0.82)_72%,transparent_100%)] dark:bg-[image:url('/images/night-640.avif')]",
  profileTextScrim:
    'absolute inset-x-0 top-0 z-[1] h-[15rem] rounded-t-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0)_24%,rgba(255,255,255,0.58)_54%,rgba(255,255,255,0.94)_74%,rgba(255,255,255,1)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.1),rgba(23,25,28,0)_24%,rgba(23,25,28,0.5)_54%,rgba(23,25,28,0.9)_74%,rgba(23,25,28,1)_100%)]',
  avatarWrapper:
    'relative z-10 mb-4 overflow-hidden rounded-full border-4 border-slate-100 shadow-sm dark:border-[#2b2f36]',
  avatar: 'h-24 w-24 object-cover transition-transform hover:scale-105',
  profileName:
    'relative z-10 mb-2 text-xl font-bold text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)] dark:text-slate-50 dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]',
  profileSignatureButton:
    'relative z-10 mb-8 cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 dark:hover:bg-white/5',
  profileSignature:
    'text-sm leading-relaxed text-slate-600 dark:text-slate-300',

  // Search
  searchContainer: 'relative flex items-center',
  searchIcon: 'absolute left-3 text-slate-400',
  searchInput: cn(
    'w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 pl-10 text-sm outline-none transition-all',
    'placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    'dark:border-[#2b2f36] dark:bg-[#17191c] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-blue-400'
  ),
  socialRow: 'mt-4 flex justify-center gap-4',
  socialBtn: 'transition-colors hover:text-slate-900 dark:hover:text-slate-200',

  // Common Widget
  widgetHeader:
    'mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800',
  widgetTitle: 'font-bold text-slate-800 dark:text-slate-100',

  // Archive
  archiveYearGroup:
    'flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
  archiveYearHeader: 'flex w-full items-center justify-between',
  archiveYear: 'font-medium text-slate-700 dark:text-slate-300',
  archiveCount:
    'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400',

  // Stats
  statsGrid: 'grid grid-cols-1 gap-4',
  statItem: 'flex items-center gap-3',
  statIconWrapper:
    'flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  statContent: 'flex flex-col',
  statValue: 'font-bold text-slate-800 dark:text-slate-100',
  statLabel: 'text-xs text-slate-500 dark:text-slate-400',
}
