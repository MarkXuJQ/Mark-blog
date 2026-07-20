import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X, Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeMode } from '@/hooks/useTheme'
import { SearchTriggerInput } from '../search/SearchTriggerInput'
import { SegmentedToggle } from '../ui/SegmentedToggle'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  useDropdown,
} from '../ui/Dropdown'

interface NavBarProps {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

function NavDropdownTrigger({
  title,
  isActive,
}: {
  title: string
  isActive: boolean
}) {
  const { isOpen } = useDropdown()

  return (
    <DropdownTrigger className={styles.dropdown.button(isActive, isOpen)}>
      <span className={styles.dropdown.label}>{title}</span>
      <ChevronDown
        size={14}
        className={cn(
          'transition-transform duration-200',
          isOpen ? 'rotate-180' : ''
        )}
      />
    </DropdownTrigger>
  )
}

function NavDropdown({
  title,
  items,
}: {
  title: string
  items: { to: string; label: string }[]
}) {
  const location = useLocation()

  // Check if any child is active to highlight the parent
  const isActive = items.some((item) => location.pathname.startsWith(item.to))
  const activeItem = items.find((item) => location.pathname.startsWith(item.to))
  const displayTitle = activeItem?.label ?? title

  return (
    <Dropdown className={styles.dropdown.container}>
      <NavDropdownTrigger title={displayTitle} isActive={isActive} />

      <DropdownContent className={styles.dropdown.menu}>
        {items.map((item) => (
          <DropdownItem key={item.to} className="p-0" asChild>
            <NavLink
              to={item.to}
              className={({ isActive }) => styles.dropdown.item(isActive)}
            >
              {item.label}
            </NavLink>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}

export function NavBar({ mode, onModeChange }: NavBarProps) {
  const { t, i18n } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const currentLang = i18n.language
  const isZh = currentLang?.startsWith('zh')

  const otherItems = [
    { to: '/timeline', label: t('nav.timeline') },
    { to: '/life', label: t('nav.life') },
    { to: '/movies', label: t('nav.movies') },
    { to: '/games', label: t('nav.games') },
  ]
  const mobilePrimaryItems = [
    { to: '/', label: t('nav.homepage') },
    { to: '/blog', label: t('nav.blog') },
    { to: '/about', label: t('nav.about') },
    { to: '/timeline', label: t('nav.timeline') },
  ]
  const mobileOtherItems = [
    { to: '/life', label: t('nav.life') },
    { to: '/movies', label: t('nav.movies') },
    { to: '/games', label: t('nav.games') },
    { to: '/links', label: t('nav.links') },
  ]

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo.link}>
        <img
          src="/favicon-32.png"
          srcSet="/favicon-32.png 1x, /favicon-64.png 2x"
          alt="Logo"
          width={32}
          height={32}
          decoding="async"
          className={styles.logo.img}
        />
        {t('siteTitle')}
      </Link>

      {/* Desktop Navigation */}
      <nav className={styles.desktop.nav}>
        <NavLink
          to="/"
          className={({ isActive }) => styles.desktop.link(isActive)}
        >
          {t('nav.homepage')}
        </NavLink>
        <NavLink
          to="/blog"
          className={({ isActive }) => styles.desktop.link(isActive)}
        >
          {t('nav.blog')}
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) => styles.desktop.link(isActive)}
        >
          {t('nav.about')}
        </NavLink>

        <NavDropdown title={t('nav.others')} items={otherItems} />

        <SegmentedToggle
          value={isZh ? 'zh' : 'en'}
          onValueChange={changeLanguage}
          ariaLabel="Language"
          size="sm"
          className="ml-2"
          buttonClassName="w-9 px-0 text-xs font-semibold"
          items={[
            {
              value: 'zh',
              ariaLabel: '切换到中文',
              content: '中',
              activeTextClassName: 'text-slate-900 dark:text-slate-100',
            },
            {
              value: 'en',
              ariaLabel: 'Switch to English',
              content: 'EN',
              activeTextClassName: 'text-slate-900 dark:text-slate-100',
            },
          ]}
        />
      </nav>

      {/* Mobile Menu Toggle */}
      <button
        className={styles.mobile.toggle}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Backdrop */}
      {createPortal(
        isMobileMenuOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null,
        document.body
      )}

      {/* Mobile Menu Content */}
      {isMobileMenuOpen && (
        <div className={styles.mobile.menu}>
          <SearchTriggerInput
            placeholder={t('search.placeholder')}
            containerClassName="mb-2"
            onTrigger={() => setIsMobileMenuOpen(false)}
          />
          <div className={styles.mobile.grid}>
            {mobilePrimaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => styles.mobile.link(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className={styles.mobile.section}>
            <div className={styles.mobile.sectionTitle}>{t('nav.others')}</div>
            <div className={styles.mobile.grid}>
              {mobileOtherItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => styles.mobile.link(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className={styles.mobile.footer}>
            <div className={styles.mobile.themeContainer}>
              {(['light', 'system', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={styles.mobile.themeButton(mode === m)}
                  onClick={() => onModeChange(m)}
                  aria-label={`Switch to ${m} mode`}
                >
                  {m === 'light' && <Sun size={16} />}
                  {m === 'system' && <Monitor size={16} />}
                  {m === 'dark' && <Moon size={16} />}
                </button>
              ))}
            </div>

            <SegmentedToggle
              value={isZh ? 'zh' : 'en'}
              onValueChange={changeLanguage}
              ariaLabel="Language"
              size="sm"
              className="order-1 justify-self-center"
              buttonClassName="w-12 px-0 text-[11px] font-semibold"
              items={[
                {
                  value: 'zh',
                  ariaLabel: '切换到中文',
                  content: '中文',
                  activeTextClassName: 'text-slate-900 dark:text-slate-100',
                },
                {
                  value: 'en',
                  ariaLabel: 'Switch to English',
                  content: 'EN',
                  activeTextClassName: 'text-slate-900 dark:text-slate-100',
                },
              ]}
            />
          </div>

        </div>
      )}
    </header>
  )
}

const styles = {
  header:
    'relative mb-6 flex h-14 items-center justify-between rounded-full bg-white/80 px-4 py-3 shadow-sm backdrop-blur transition-colors duration-300 sm:px-6 dark:bg-[#17191c] dark:text-slate-100',
  logo: {
    link: 'heading-brand flex items-center gap-2 text-lg font-semibold transition-opacity hover:opacity-80',
    img: 'h-8 w-8 rounded-sm',
  },
  desktop: {
    nav: 'hidden items-center gap-4 text-sm md:flex',
    link: (isActive: boolean) =>
      cn(
        'transition-colors',
        isActive
          ? 'font-bold text-slate-900 dark:text-slate-100'
          : 'font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
      ),
  },
  mobile: {
    toggle:
      'flex p-1 text-slate-600 transition-colors hover:text-slate-900 md:hidden dark:text-slate-300 dark:hover:text-white',
    menu: 'absolute top-full left-2 right-2 z-50 mt-2 flex max-h-[calc(100vh-5rem)] flex-col gap-1 overflow-y-auto rounded-[20px] border border-slate-200/80 bg-white/96 p-3 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl md:hidden dark:border-[#2b2f36] dark:bg-[#17191c]/96',
    link: (isActive: boolean) =>
      cn(
        'flex min-h-11 items-center justify-start rounded-xl px-3 py-2.5 text-sm text-left transition-colors',
        isActive
          ? 'bg-slate-100 font-bold text-slate-900 dark:bg-[#23262c] dark:text-slate-100'
          : 'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#23262c] dark:hover:text-slate-200'
      ),
    section: 'mt-2 border-t border-slate-100 pt-2 dark:border-[#2b2f36]',
    sectionTitle:
      'px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500',
    grid: 'grid grid-cols-2 gap-1.5',
    footer:
      'mt-2 flex flex-col items-center gap-3 border-t border-slate-100 px-1 pt-3 pb-1 dark:border-[#2b2f36]',
    themeContainer: 'order-2 flex items-center justify-center gap-2',
    themeButton: (isActive: boolean) =>
      cn(
        'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
        isActive
          ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200 dark:bg-[#23262c] dark:text-slate-100 dark:ring-[#2b2f36]'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-[#23262c]'
      ),
  },
  dropdown: {
    container: 'relative',
    button: (isActive: boolean, isOpen: boolean) =>
      cn(
        'flex cursor-pointer items-center gap-1 transition-colors',
        isActive || isOpen
          ? 'font-bold text-slate-900 dark:text-slate-100'
          : 'font-normal text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      ),
    label: 'inline-flex w-[3.75rem] justify-center truncate text-center',
    menu: 'absolute top-full right-0 mt-2 w-max min-w-0 origin-top-right rounded-lg bg-white p-1 shadow-lg dark:bg-[#17191c]',
    item: (isActive: boolean) =>
      cn(
        'block whitespace-nowrap rounded-md px-4 py-2 text-sm transition-colors',
        isActive
          ? 'bg-slate-100 text-slate-900 dark:bg-[#23262c] dark:text-slate-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#23262c] dark:hover:text-slate-200'
      ),
  },
}
