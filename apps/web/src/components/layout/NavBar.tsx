import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

function NavDropdown({
  title,
  items,
}: {
  title: string
  items: { to: string; label: string }[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if any child is active to highlight the parent
  const isActive = items.some((item) => location.pathname.startsWith(item.to))

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 transition-colors cursor-pointer ${
          isActive || isOpen
            ? 'font-bold text-slate-900 dark:text-slate-100'
            : 'font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        {title}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-32 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-md px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function NavBar() {
  const { t, i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const currentLang = i18n.language

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'font-bold text-slate-900 dark:text-slate-100'
      : 'font-normal text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors'

  const otherItems = [
    { to: '/timeline', label: t('nav.timeline') },
    { to: '/life', label: t('nav.life') },
    { to: '/movies', label: t('nav.movies') },
    { to: '/games', label: t('nav.games') },
  ]

  return (
    <header className="mb-6 flex items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-6 py-3 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
      <Link
        to="/"
        className="flex items-center gap-2 text-lg font-semibold transition-opacity hover:opacity-80"
      >
        <img src="/favicon.png" alt="Logo" className="h-8 w-8 rounded-sm" />
        {t('siteTitle')}
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <NavLink to="/" className={navLinkClass}>
          {t('nav.homepage')}
        </NavLink>
        <NavLink to="/blog" className={navLinkClass}>
          {t('nav.blog')}
        </NavLink>
        <NavLink to="/about" className={navLinkClass}>
          {t('nav.about')}
        </NavLink>
        
        <NavDropdown title={t('nav.others')} items={otherItems} />

        <div className="ml-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={
                currentLang === 'zh'
                  ? 'font-bold text-slate-900 dark:text-slate-100'
                  : 'opacity-60 transition-opacity hover:opacity-100'
              }
              onClick={() => changeLanguage('zh')}
            >
              中
            </button>
            <span className="opacity-30">/</span>
            <button
              type="button"
              className={
                currentLang === 'en'
                  ? 'font-bold text-slate-900 dark:text-slate-100'
                  : 'opacity-60 transition-opacity hover:opacity-100'
              }
              onClick={() => changeLanguage('en')}
            >
              EN
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
