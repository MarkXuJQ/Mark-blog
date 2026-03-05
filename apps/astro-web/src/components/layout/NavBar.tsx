import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Menu, X, Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useTheme } from '../../hooks/useTheme'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  useDropdown,
} from '../ui/Dropdown'
import '../../i18n'

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
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  const isActive = items.some((item) => pathname.startsWith(item.to))

  return (
    <Dropdown className={styles.dropdown.container}>
      <NavDropdownTrigger title={title} isActive={isActive} />

      <DropdownContent className={styles.dropdown.menu}>
        {items.map((item) => (
          <DropdownItem key={item.to} className="p-0">
            <a
              href={item.to}
              className={styles.dropdown.item(pathname === item.to)}
            >
              {item.label}
            </a>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}

export function NavBar() {
  const { t, i18n } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [pathname, setPathname] = useState('')
  const { mode: themeMode, setMode: setThemeMode } = useTheme()

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const currentLang = i18n.language

  const navItems = [
    { to: '/', label: t('nav.homepage') },
    { to: '/blog', label: t('nav.blog') },
    { to: '/about', label: t('nav.about') },
  ]

  const otherItems = [
    { to: '/timeline', label: t('nav.timeline') },
    { to: '/life', label: t('nav.life') },
    { to: '/movies', label: t('nav.movies') },
    { to: '/games', label: t('nav.games') },
  ]

  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo.link}>
        <img
          src="/favicon.png"
          alt="Logo"
          width={32}
          height={32}
          className={styles.logo.img}
        />
        {t('siteTitle')}
      </a>

      {/* Desktop Navigation */}
      <nav className={styles.desktop.nav}>
        {navItems.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className={styles.desktop.link(pathname === item.to)}
          >
            {item.label}
          </a>
        ))}

        <NavDropdown title={t('nav.others')} items={otherItems} />

        <div className="ml-6 flex items-center gap-4 border-l border-slate-200 pl-6 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={styles.desktop.langButton(currentLang.startsWith('zh'))}
              onClick={() => changeLanguage('zh')}
            >
              中
            </button>
            <span className="opacity-30">/</span>
            <button
              type="button"
              className={styles.desktop.langButton(currentLang.startsWith('en'))}
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

      {/* Mobile Menu Content */}
      {isMobileMenuOpen && (
        <div className={styles.mobile.menu}>
          {navItems.map((item) => (
            <a
              key={item.to}
              href={item.to}
              className={styles.mobile.link(pathname === item.to)}
            >
              {item.label}
            </a>
          ))}

          <div className={styles.mobile.section}>
            <div className={styles.mobile.sectionTitle}>
              {t('nav.others')}
            </div>
            <div className={styles.mobile.grid}>
              {otherItems.map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  className={styles.mobile.link(pathname === item.to)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.mobile.controls}>
            <button
              type="button"
              className={styles.mobile.langButton(currentLang.startsWith('zh'))}
              onClick={() => changeLanguage('zh')}
            >
              中文
            </button>
            <button
              type="button"
              className={styles.mobile.langButton(currentLang.startsWith('en'))}
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
                className={styles.mobile.themeButton(themeMode === m)}
                onClick={() => setThemeMode(m)}
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
    'relative flex items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur transition-colors duration-300 sm:px-6 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100',
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
    themeContainer: 'mt-4 flex items-center justify-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800',
    themeButton: (isActive: boolean) =>
      cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
        isActive
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
      ),
  },
  dropdown: {
    container: 'relative',
    button: (isActive: boolean, isOpen: boolean) =>
      cn(
        'flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'font-bold text-slate-900 dark:text-slate-100'
          : 'font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
      ),
    menu: 'absolute left-0 mt-2 min-w-[12rem] origin-top-left rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90',
    item: (isActive: boolean) =>
      cn(
        'block rounded-xl px-4 py-2 text-sm transition-colors',
        isActive
          ? 'bg-slate-100 font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
          : 'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
      ),
  },
}
