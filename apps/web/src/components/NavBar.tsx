import type { Lang } from '../i18n'
import { messages } from '../i18n'

type Messages = (typeof messages)[Lang]

export type NavBarProps = {
  lang: Lang
  t: Messages
  onLangChange: (lang: Lang) => void
}

export function NavBar({ lang, t, onLangChange }: NavBarProps) {
  return (
    <header className="mb-6 flex items-center justify-between rounded-full border px-6 py-3">
      <div className="text-lg font-semibold">Mark&apos;s house</div>
      <nav className="flex items-center gap-4 text-sm">
        <button type="button" className="hover:underline">
          {t.nav.Homepage}
        </button>
        <button type="button" className="hover:underline">
          {t.nav.blog}
        </button>
        <button type="button" className="hover:underline">
          {t.nav.life}
        </button>
        <button type="button" className="hover:underline">
          {t.nav.movies}
        </button>
        <button type="button" className="hover:underline">
          {t.nav.games}
        </button>
        <button type="button" className="hover:underline">
          {t.nav.links}
        </button>
        <div className="ml-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={
                lang === 'zh'
                  ? 'font-semibold underline'
                  : 'opacity-60 hover:opacity-100'
              }
              onClick={() => onLangChange('zh')}
            >
              中
            </button>
            <span>/</span>
            <button
              type="button"
              className={
                lang === 'en'
                  ? 'font-semibold underline'
                  : 'opacity-60 hover:opacity-100'
              }
              onClick={() => onLangChange('en')}
            >
              EN
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}

