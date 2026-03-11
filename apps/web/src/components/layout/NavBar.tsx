import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X, Sun, Moon, Monitor } from 'lucide-react'
import type { ThemeMode } from '../../hooks/useTheme'
import { cn } from '../../utils/cn'
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
  const langIndex = isZh ? 0 : 1

  const otherItems = [
    { to: '/timeline', label: t('nav.timeline') },
    { to: '/life', label: t('nav.life') },
    { to: '/movies', label: t('nav.movies') },
    { to: '/games', label: t('nav.games') },
  ]

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo.link}>
        <img
          src="/favicon.png"
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

        <div className={styles.desktop.langToggle.container} role="radiogroup" aria-label="Language">
          <div
            aria-hidden="true"
            className={styles.desktop.langToggle.knob}
            style={{ transform: `translateX(${langIndex * 100}%)` }}
          />
          <button
            type="button"
            role="radio"
            aria-checked={isZh}
            className={styles.desktop.langToggle.button(isZh)}
            onClick={() => changeLanguage('zh')}
            aria-label="切换到中文"
          >
            中
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isZh}
            className={styles.desktop.langToggle.button(!isZh)}
            onClick={() => changeLanguage('en')}
            aria-label="Switch to English"
          >
            EN
          </button>
        </div>
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
          <NavLink
            to="/"
            className={({ isActive }) => styles.mobile.link(isActive)}
          >
            {t('nav.homepage')}
          </NavLink>
          <NavLink
            to="/blog"
            className={({ isActive }) => styles.mobile.link(isActive)}
          >
            {t('nav.blog')}
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => styles.mobile.link(isActive)}
          >
            {t('nav.about')}
          </NavLink>

          <div className={styles.mobile.section}>
            <div className={styles.mobile.sectionTitle}>{t('nav.others')}</div>
            <div className={styles.mobile.grid}>
              {otherItems.map((item) => (
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

          <div className={styles.mobile.controls}>
            <div className={styles.mobile.langToggle.container}>
              <div
                aria-hidden="true"
                className={styles.mobile.langToggle.knob}
                style={{ transform: `translateX(${langIndex * 100}%)` }}
              />
              <button
                type="button"
                className={styles.mobile.langToggle.button(isZh)}
                onClick={() => changeLanguage('zh')}
                aria-label="切换到中文"
              >
                中文
              </button>
              <button
                type="button"
                className={styles.mobile.langToggle.button(!isZh)}
                onClick={() => changeLanguage('en')}
                aria-label="Switch to English"
              >
                English
              </button>
            </div>
          </div>

          {/* Mobile Theme Toggle */}
          <div className={styles.mobile.themeContainer}>
            {(['light', 'system', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={styles.mobile.themeButton(mode === m)}
                onClick={() => onModeChange(m)}
                aria-label={`Switch to ${m} mode`}
              >
                {m === 'light' && <Sun size={20} />}
                {m === 'system' && <Monitor size={20} />}
                {m === 'dark' && <Moon size={20} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

const styles = {
  header:
    'relative mb-6 flex h-14 items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur transition-colors duration-300 sm:px-6 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100',
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
    langToggle: {
      container:
        'relative isolate ml-2 inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 p-0.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70',
      knob:
        'pointer-events-none absolute left-0.5 top-0.5 h-7 w-9 rounded-full bg-slate-900 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-white',
      button: (isActive: boolean) =>
        cn(
          'relative z-10 inline-flex h-7 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
          isActive
            ? 'text-white dark:text-slate-900'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        ),
    },
  },
  mobile: {
    toggle:
      'flex p-1 text-slate-600 transition-colors hover:text-slate-900 md:hidden dark:text-slate-300 dark:hover:text-white',
    menu: 'absolute top-full right-0 left-0 z-50 mt-2 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:hidden dark:border-slate-800 dark:bg-slate-900',
    link: (isActive: boolean) =>
      cn(
        'block px-4 py-3 text-base transition-colors rounded-md',
        isActive
          ? 'bg-slate-100 font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
          : 'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      ),
    section: 'my-2 border-t border-slate-100 pt-2 dark:border-slate-800',
    sectionTitle:
      'px-4 py-2 text-xs font-semibold text-slate-500 uppercase dark:text-slate-500',
    grid: 'grid grid-cols-2 gap-2',
    controls:
      'mt-2 flex items-center justify-center border-t border-slate-100 pt-4 dark:border-slate-800',
    langToggle: {
      container:
        'relative isolate inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 p-0.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70',
      knob:
        'pointer-events-none absolute left-0.5 top-0.5 h-9 w-20 rounded-full bg-slate-900 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-white',
      button: (isActive: boolean) =>
        cn(
          'relative z-10 inline-flex h-9 w-20 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
          isActive
            ? 'text-white dark:text-slate-900'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        ),
    },
    themeContainer:
      'mt-2 flex items-center justify-center gap-4 border-t border-slate-100 pt-4 pb-2 dark:border-slate-800',
    themeButton: (isActive: boolean) =>
      cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        isActive
          ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
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
    menu: 'absolute top-full right-0 mt-2 w-32 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10',
    item: (isActive: boolean) =>
      cn(
        'block rounded-md px-4 py-2 text-sm transition-colors',
        isActive
          ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      ),
  },
}
