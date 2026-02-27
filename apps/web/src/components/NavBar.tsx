import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

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

  return (
    <header className="mb-6 flex items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-6 py-3 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
      <div className="text-lg font-semibold">{t('siteTitle')}</div>
      <nav className="flex items-center gap-4 text-sm">
        <NavLink to="/" className={navLinkClass}>
          {t('nav.homepage')}
        </NavLink>
        <NavLink to="/blog" className={navLinkClass}>
          {t('nav.blog')}
        </NavLink>
        <NavLink to="/timeline" className={navLinkClass}>
          {t('nav.timeline')}
        </NavLink>
        <NavLink to="/life" className={navLinkClass}>
          {t('nav.life')}
        </NavLink>
        <NavLink to="/movies" className={navLinkClass}>
          {t('nav.movies')}
        </NavLink>
        <NavLink to="/games" className={navLinkClass}>
          {t('nav.games')}
        </NavLink>
        <div className="ml-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={
                currentLang === 'zh'
                  ? 'font-bold text-slate-900 dark:text-slate-100'
                  : 'opacity-60 hover:opacity-100 transition-opacity'
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
                  : 'opacity-60 hover:opacity-100 transition-opacity'
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
