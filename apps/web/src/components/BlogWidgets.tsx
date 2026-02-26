import { useTranslation } from 'react-i18next'
import { Card } from './Card'
import { cn } from '../utils/cn'
import { Search, Calendar, Clock, FileText, Activity, Hash, Layers } from 'lucide-react'
import { LuGithub } from "react-icons/lu";
import { RiBilibiliLine } from "react-icons/ri";
import type { BlogPost } from '../types'
import { countWords } from '../utils/readingTime'

// --- Profile Content (Internal) ---
function ProfileContent() {
  const { t } = useTranslation()
  const signature = t('blog.sidebar.profile.signature')
  let line1 = signature
  let line2 = ''
  const lower = signature.toLowerCase()
  const idxResume = lower.indexOf('resume')
  if (idxResume >= 0) {
    line1 = signature.slice(0, idxResume).trim()
    line2 = signature.slice(idxResume).trim()
  } else {
    const idxChi = signature.indexOf('，')
    const idxEng = signature.indexOf(',')
    const idxSemi = signature.indexOf(';')
    let idx = -1
    if (idxChi >= 0) { idx = idxChi }
    else if (idxEng >= 0) { idx = idxEng }
    else if (idxSemi >= 0) { idx = idxSemi }
    if (idx >= 0) {
      line1 = signature.slice(0, idx + 1)
      line2 = signature.slice(idx + 1).trim()
    }
  }
  return (
    <>
      <div className={styles.profileContainer}>
        <div className={styles.avatarWrapper}>
          <img
            src="/images/IMG_1766.JPG"
            alt="Profile Avatar"
            className={styles.avatar}
          />
        </div>
        <h3 className={styles.profileName}>Mark Xu</h3>
        <p className={styles.profileSignature}>
          <span>{line1}</span>
          {line2 && (
            <>
              <br />
              <span>{line2}</span>
            </>
          )}
        </p>
      </div>
      
      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={18} />
        <input 
          type="text" 
          placeholder={t('blog.sidebar.search.placeholder')}
          className={styles.searchInput}
        />
      </div>

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
interface ArchiveContentProps {
  posts: BlogPost[]
}

function ArchiveContent({ posts }: ArchiveContentProps) {
  const { t } = useTranslation()
  
  // Group posts by year
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(post)
    return acc
  }, {} as Record<number, BlogPost[]>)
  
  // Sort years descending
  const years = Object.keys(postsByYear).map(Number).sort((a, b) => b - a)
  
  return (
    <>
      <div className={styles.widgetHeader}>
        <Layers size={20} className="text-blue-500" />
        <h3 className={styles.widgetTitle}>{t('blog.sidebar.archive.title')}</h3>
      </div>
      
      <div className="space-y-4">
        {years.map(year => (
          <div key={year} className={styles.archiveYearGroup}>
            <div className={styles.archiveYearHeader}>
              <span className={styles.archiveYear}>{year}</span>
              <span className={styles.archiveCount}>{postsByYear[year].length}</span>
            </div>
            {/* Optional: List top 3 posts or just keep it as year buckets for now */}
          </div>
        ))}
      </div>
    </>
  )
}

// --- Archive Widget (Wrapper) ---
interface ArchiveWidgetProps {
  posts: BlogPost[]
}

export function ArchiveWidget({ posts }: ArchiveWidgetProps) {
  return (
    <Card as="aside" className={styles.widgetCard}>
      <ArchiveContent posts={posts} />
    </Card>
  )
}

// --- Combined Left Sidebar Widget ---
interface LeftSidebarWidgetProps {
  posts: BlogPost[]
}

export function LeftSidebarWidget({ posts }: LeftSidebarWidgetProps) {
  return (
    <Card as="aside" className={styles.widgetCard}>
      <ProfileContent />
      <div className="my-6 border-t border-slate-100 dark:border-slate-800" />
      <ArchiveContent posts={posts} />
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
  
  // Last updated date
  const lastUpdated = posts.length > 0 
    ? new Date(Math.max(...posts.map(p => new Date(p.date).getTime())))
    : new Date()
    
  // Running time (assuming start date is 2024-01-01, adjust as needed)
  const startDate = new Date('2024-01-01')
  const runningDays = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
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
          value={lastUpdated.toLocaleDateString()} 
        />
      </div>
    </Card>
  )
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
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
  widgetCard: "p-6 transition-all hover:shadow-md",
  
  // Profile
  profileContainer: "flex flex-col items-center text-center",
  avatarWrapper: "mb-4 overflow-hidden rounded-full border-4 border-slate-100 shadow-sm dark:border-slate-800",
  avatar: "h-24 w-24 object-cover transition-transform hover:scale-105",
  profileName: "mb-2 text-xl font-bold text-slate-800 dark:text-slate-100",
  profileSignature: "mb-8 text-sm italic leading-relaxed text-slate-500 dark:text-slate-400",
  
  // Search
  searchContainer: "relative flex items-center",
  searchIcon: "absolute left-3 text-slate-400",
  searchInput: cn(
    "w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 pl-10 text-sm outline-none transition-all",
    "placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
    "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-400"
  ),
  socialRow: "mt-4 flex justify-center gap-4",
  socialBtn: "transition-colors hover:text-slate-900 dark:hover:text-slate-200",
  
  // Common Widget
  widgetHeader: "mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800",
  widgetTitle: "font-bold text-slate-800 dark:text-slate-100",
  
  // Archive
  archiveYearGroup: "flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
  archiveYearHeader: "flex w-full items-center justify-between",
  archiveYear: "font-medium text-slate-700 dark:text-slate-300",
  archiveCount: "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  
  // Stats
  statsGrid: "grid grid-cols-1 gap-4",
  statItem: "flex items-center gap-3",
  statIconWrapper: "flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  statContent: "flex flex-col",
  statValue: "font-bold text-slate-800 dark:text-slate-100",
  statLabel: "text-xs text-slate-500 dark:text-slate-400"
}
