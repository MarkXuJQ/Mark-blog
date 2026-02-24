import { useTranslation } from 'react-i18next'

export function NavBar() {
  const { t, i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const currentLang = i18n.language

  return (
    <header className="mb-6 flex items-center justify-between rounded-full border border-slate-200/70 bg-white/80 px-6 py-3 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
      <div className="text-lg font-semibold">{t('siteTitle')}</div>
      <nav className="flex items-center gap-4 text-sm">
        <button type="button" className="hover:underline">
          {t('nav.homepage')}
        </button>
        <button type="button" className="hover:underline">
          {t('nav.blog')}
        </button>
        <button type="button" className="hover:underline">
          {t('nav.life')}
        </button>
        <button type="button" className="hover:underline">
          {t('nav.movies')}
        </button>
        <button type="button" className="hover:underline">
          {t('nav.games')}
        </button>
        <button type="button" className="hover:underline">
          {t('nav.links')}
        </button>
        <div className="ml-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={
                currentLang === 'zh'
                  ? 'font-semibold underline'
                  : 'opacity-60 hover:opacity-100'
              }
              onClick={() => changeLanguage('zh')}
            >
              中
            </button>
            <span>/</span>
            <button
              type="button"
              className={
                currentLang === 'en'
                  ? 'font-semibold underline'
                  : 'opacity-60 hover:opacity-100'
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
