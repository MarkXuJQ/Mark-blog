import { useEffect, useState } from 'react'
import { estimateReadingTime } from './utils/readingTime'
import { messages, type Lang } from './i18n'
import { ThemeToggle, type ThemeMode } from './components/ThemeToggle'
import { NavBar } from './components/NavBar'
import { Card } from './components/Card'

const sampleText =
  'This is a personal blog website where I share my thoughts, experiences, and knowledge about various topics.'

function App() {
  const [lang, setLang] = useState<Lang>('zh')
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [isSystemDark, setIsSystemDark] = useState(false)
  const t = messages[lang]
  const readingMinutes = estimateReadingTime(sampleText)

  useEffect(() => {
    if (!window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateSystemPreference = (event: MediaQueryListEvent) => {
      setIsSystemDark(event.matches)
    }

    setIsSystemDark(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateSystemPreference)

    return () => {
      mediaQuery.removeEventListener('change', updateSystemPreference)
    }
  }, [])

  const effectiveDark =
    themeMode === 'dark' || (themeMode === 'system' && isSystemDark)

  const rootClassName = `min-h-screen p-4 transition-colors duration-300 ${
    effectiveDark ? 'bg-slate-900 text-slate-50' : 'bg-white text-slate-900'
  }`

  return (
    <div className={rootClassName}>
      <NavBar lang={lang} t={t} onLangChange={setLang} />

      <main className="mx-auto max-w-3xl">
        <Card>
          <h1 className="text-3xl font-bold underline">{t.home.title}</h1>

          <p className="mt-4">{t.home.intro}</p>

          <img
            src="/images/logo.png"
            alt="Mark's Blog Logo"
            className="mt-4 h-16 w-auto"
          />

          <p className="mt-4">{t.home.description}</p>

          <p className="mt-2 text-sm text-slate-500">
            {t.readingTimeLabel(readingMinutes)}
          </p>

          <a
            href="https://github.com/MarkXuJQ"
            className="mt-4 inline-block text-blue-500 underline hover:text-blue-600"
          >
            {t.githubLabel}
          </a>
        </Card>
      </main>

      <ThemeToggle mode={themeMode} onModeChange={setThemeMode} />
    </div>
  )
}

export default App
