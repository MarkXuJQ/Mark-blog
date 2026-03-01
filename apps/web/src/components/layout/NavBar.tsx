import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
      {title}
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

  return (
    <Dropdown className={styles.dropdown.container}>
      <NavDropdownTrigger title={title} isActive={isActive} />

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

  const otherItems = [
    { to: '/timeline', label: t('nav.timeline') },
    { to: '/life', label: t('nav.life') },
    { to: '/movies', label: t('nav.movies') },
    { to: '/games', label: t('nav.games') },
  ]

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo.link}>
        <img src="/favicon.png" alt="Logo" className={styles.logo.img} />
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

        <div className="ml-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={styles.desktop.langButton(currentLang === 'zh')}
              onClick={() => changeLanguage('zh')}
            >
              中
            </button>
            <span className="opacity-30">/</span>
            <button
              type="button"
              className={styles.desktop.langButton(currentLang === 'en')}
              onClick={() => changeLanguage('en')}
            >
              EN
            </button>
          </div>
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={styles.mobile.menu}
          >
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
              <div className={styles.mobile.sectionTitle}>
                {t('nav.others')}
              </div>
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
              <button
                type="button"
                className={styles.mobile.langButton(currentLang === 'zh')}
                onClick={() => changeLanguage('zh')}
              >
                中文
              </button>
              <button
                type="button"
                className={styles.mobile.langButton(currentLang === 'en')}
                onClick={() => changeLanguage('en')}
              >
                English
              </button>
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
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

const styles = {
  header:
    'relative mb-6 flex items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur transition-colors duration-300 sm:px-6 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100',
  logo: {
    link: 'flex items-center gap-2 text-lg font-semibold transition-opacity hover:opacity-80',
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
    langButton: (isActive: boolean) =>
      cn(
        isActive
          ? 'font-bold text-slate-900 dark:text-slate-100'
          : 'opacity-60 transition-opacity hover:opacity-100'
      ),
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
      'mt-2 flex items-center justify-center gap-6 border-t border-slate-100 pt-4 dark:border-slate-800',
    langButton: (isActive: boolean) =>
      cn(
        'rounded-md px-4 py-2 transition-colors',
        isActive
          ? 'bg-slate-100 font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
      ),
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
