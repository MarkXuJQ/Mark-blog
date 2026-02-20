import { useState } from 'react'
import { estimateReadingTime } from './utils/readingTime'
import { messages, type Lang } from './i18n'

const sampleText =
  "This is a personal blog website where I share my thoughts, experiences, and knowledge about various topics."

function App() {
  const [lang, setLang] = useState<Lang>('zh')
  const t = messages[lang]
  const readingMinutes = estimateReadingTime(sampleText)

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center justify-between">
        <div className="text-lg font-semibold">{t.siteTitle}</div>
        <nav className="flex items-center gap-4 text-sm">
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
          <div className="ml-4 flex items-center gap-2">
            <button
              type="button"
              className={lang === 'zh' ? 'font-semibold underline' : 'opacity-60 hover:opacity-100'}
              onClick={() => setLang('zh')}
            >
              中
            </button>
            <span>/</span>
            <button
              type="button"
              className={lang === 'en' ? 'font-semibold underline' : 'opacity-60 hover:opacity-100'}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </nav>
      </header>

      <main>
        <h1 className="text-3xl font-bold underline">
          {t.home.title}
        </h1>

        <p className="mt-4">
          {t.home.intro}
        </p>

        <img
          src="/images/logo.png"
          alt="Mark's Blog Logo"
          className="mt-4 h-16 w-auto"
        />

        <p className="mt-4">
          {t.home.description}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {t.readingTimeLabel(readingMinutes)}
        </p>  

        <a
          href="https://github.com/MarkXuJQ"
          className="mt-4 inline-block text-blue-500 underline hover:text-blue-600"
        >
          {t.githubLabel}
        </a>
      </main>
    </div>
  )
}

export default App
