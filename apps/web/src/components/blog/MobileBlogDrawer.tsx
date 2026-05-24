import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Layers, X } from 'lucide-react'
import { FiSidebar } from 'react-icons/fi'
import { RiLinksLine } from 'react-icons/ri'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/utils/image'

interface MobileBlogDrawerProps {
  simpleMode: boolean
  onToggleMode: () => void
}

const PORTAL_ROOT_ID = 'mobile-blog-drawer-root'

export function MobileBlogDrawer({
  simpleMode,
  onToggleMode,
}: MobileBlogDrawerProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const isZh = i18n.language?.startsWith('zh')
  const shouldShowTrigger =
    location.pathname === '/blog' ||
    location.pathname === '/archive' ||
    location.pathname === '/links'

  useEffect(() => {
    if (window.__PRERENDER__) return

    let root = document.getElementById(PORTAL_ROOT_ID)
    if (!root) {
      root = document.createElement('div')
      root.id = PORTAL_ROOT_ID
      document.body.appendChild(root)
    }
    setPortalRoot(root)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!shouldShowTrigger) setOpen(false)
  }, [shouldShowTrigger])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const linksLabel = isZh ? '友链' : 'Friends'
  const signature = isZh
    ? '光阴分百份，此周占二分。'
    : 'One of fifty-two, two percent of the year.'

  return (
    <>
      {shouldShowTrigger ? (
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen(true)}
          data-mobile-blog-drawer-trigger="true"
          aria-label={isZh ? '打开博客侧栏' : 'Open blog drawer'}
        >
          <FiSidebar size={22} className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}

      {portalRoot
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <>
                  <motion.button
                    type="button"
                    className={styles.backdrop}
                    aria-label={isZh ? '关闭博客侧栏' : 'Close blog drawer'}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  />

                  <motion.aside
                    className={styles.drawer}
                    role="dialog"
                    aria-modal="true"
                    aria-label={isZh ? '博客侧栏' : 'Blog drawer'}
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  >
                    <div className={styles.profile}>
                      <div
                        className={styles.profileBackdrop}
                        aria-hidden="true"
                      />
                      <div className={styles.profileScrim} aria-hidden="true" />
                      <button
                        type="button"
                        className={styles.closeButton}
                        onClick={() => setOpen(false)}
                        aria-label={isZh ? '关闭' : 'Close'}
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                      <div className={styles.avatarWrapper}>
                        <img
                          src={getImageUrl('/images/IMG_1766.JPG')}
                          alt="Profile Avatar"
                          width={72}
                          height={72}
                          loading="lazy"
                          decoding="async"
                          className={styles.avatar}
                        />
                      </div>
                      <h2 className={styles.profileName}>Mark Xu</h2>
                      <p className={styles.profileSignature}>{signature}</p>
                    </div>

                    <nav
                      className={styles.nav}
                      aria-label={isZh ? '博客导航' : 'Blog navigation'}
                    >
                      <DrawerLink
                        to="/blog"
                        icon={<FileText size={18} aria-hidden="true" />}
                        label={t('nav.blog')}
                      />
                      <DrawerLink
                        to="/archive"
                        icon={<Layers size={18} aria-hidden="true" />}
                        label={t('blog.sidebar.archive.title')}
                      />
                      <DrawerLink
                        to="/links"
                        icon={<RiLinksLine size={18} aria-hidden="true" />}
                        label={linksLabel}
                      />
                    </nav>

                    <div className={styles.modePanel}>
                      <div>
                        <p className={styles.modeTitle}>
                          {isZh ? '阅读模式' : 'Reading Mode'}
                        </p>
                        <p className={styles.modeHint}>
                          {simpleMode
                            ? isZh
                              ? '当前是简洁模式'
                              : 'Simple mode is on'
                            : isZh
                              ? '当前是丰富模式'
                              : 'Rich mode is on'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.modeButton}
                        onClick={onToggleMode}
                        aria-pressed={simpleMode}
                      >
                        {simpleMode
                          ? isZh
                            ? '切回丰富'
                            : 'Use Rich'
                          : isZh
                            ? '切到简洁'
                            : 'Use Simple'}
                      </button>
                    </div>
                  </motion.aside>
                </>
              ) : null}
            </AnimatePresence>,
            portalRoot
          )
        : null}
    </>
  )
}

function DrawerLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <NavLink to={to} className={({ isActive }) => styles.navLink(isActive)}>
      <span className={styles.navIcon}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

const styles = {
  trigger:
    'fixed right-6 bottom-6 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-900',
  backdrop:
    'fixed inset-0 z-[89] bg-slate-950/24 backdrop-blur-[2px] lg:hidden',
  drawer:
    'fixed inset-y-0 left-0 z-[90] flex w-[min(72vw,300px)] min-w-[260px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl lg:hidden dark:border-[#2b2f36] dark:bg-[#17191c]',
  profile:
    'relative flex min-h-[208px] flex-col items-center overflow-hidden px-5 pt-8 pb-5 text-center',
  profileBackdrop:
    "absolute inset-x-0 top-0 z-0 h-[14rem] bg-[image:url('/images/day-640.avif')] bg-cover bg-center blur-[1.2px] scale-[1.02] [mask-image:linear-gradient(to_bottom,black_0%,black_58%,rgba(0,0,0,0.82)_74%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_58%,rgba(0,0,0,0.82)_74%,transparent_100%)] dark:bg-[image:url('/images/night-640.avif')]",
  profileScrim:
    'absolute inset-x-0 top-0 z-[1] h-[14rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0)_24%,rgba(255,255,255,0.62)_58%,rgba(255,255,255,0.96)_82%,rgba(255,255,255,1)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(23,25,28,0)_24%,rgba(23,25,28,0.56)_58%,rgba(23,25,28,0.94)_82%,rgba(23,25,28,1)_100%)]',
  closeButton:
    'absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/72 text-slate-600 backdrop-blur transition-colors hover:bg-white hover:text-slate-900 dark:bg-black/24 dark:text-slate-300 dark:hover:bg-black/36 dark:hover:text-white',
  avatarWrapper:
    'relative z-10 mb-3 overflow-hidden rounded-full border-4 border-slate-100 shadow-sm dark:border-[#2b2f36]',
  avatar: 'h-[72px] w-[72px] object-cover',
  profileName:
    'relative z-10 text-lg font-semibold text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)] dark:text-slate-50 dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]',
  profileSignature:
    'relative z-10 mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300',
  nav: 'flex flex-col gap-2 px-4 py-4',
  navLink: (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
      isActive
        ? 'bg-slate-100 text-slate-950 dark:bg-[#23262c] dark:text-slate-100'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-[#23262c] dark:hover:text-slate-100'
    ),
  navIcon: 'text-blue-500',
  modePanel:
    'mx-4 mt-auto mb-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#2b2f36] dark:bg-[#202328]',
  modeTitle: 'text-sm font-medium text-slate-900 dark:text-slate-100',
  modeHint: 'mt-0.5 text-xs text-slate-500 dark:text-slate-400',
  modeButton:
    'shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
}
