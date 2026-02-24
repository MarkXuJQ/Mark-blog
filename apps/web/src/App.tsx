import { useTranslation } from 'react-i18next'
import { estimateReadingTime } from './utils/readingTime'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'
import { NavBar } from './components/NavBar'
import { Footer } from './components/Footer'
import { Card } from './components/Card'

const sampleText =
  'This is a personal blog website where I share my thoughts, experiences, and knowledge about various topics.'

function App() {
  const { t } = useTranslation()
  const { mode, setMode } = useTheme()
  const readingMinutes = estimateReadingTime(sampleText)

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-3xl">
        <NavBar />

        <main className="mt-8">
          <Card className="relative">
            <div className="absolute right-6 top-6 text-sm text-slate-500 dark:text-slate-400">
              {t('home.readingTime', { minutes: readingMinutes })}
            </div>

            <h1 className="text-3xl font-bold underline decoration-sky-500 decoration-4 underline-offset-4">
              {t('home.title')}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              {t('home.intro')}
            </p>

            <div className="my-8 flex justify-center">
              <img
                src="/images/IMG_1766.JPG"
                alt="Mark's Blog Logo"
                className="h-32 w-32 rounded-full border-4 border-white shadow-lg dark:border-slate-800"
              />
            </div>

            <p className="mt-4 text-slate-700 dark:text-slate-300">
              {t('home.description')}
            </p>
          </Card>
        </main>

        <Footer />
      </div>

      <ThemeToggle mode={mode} onModeChange={setMode} />
    </div>
  )
}

export default App
