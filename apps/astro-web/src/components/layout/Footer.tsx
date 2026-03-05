import { useTranslation } from 'react-i18next'
import { LuGithub } from "react-icons/lu";
import { RiBilibiliLine, RiTwitterXFill, RiInstagramLine } from "react-icons/ri";
import { RiRssLine } from 'react-icons/ri'
import '../../i18n'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-slate-200 py-8 text-center text-sm text-slate-500 transition-colors dark:border-slate-800 dark:text-slate-400">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/MarkXuJQ"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="GitHub"
          >
            <LuGithub size={20} />
          </a>
          <a
            href="https://space.bilibili.com/351772037"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="Bilibili"
          >
            <RiBilibiliLine size={20} />
          </a>
          <a
            href="https://x.com/MXu269/articles"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="X (Twitter)"
          >
            <RiTwitterXFill size={20} />
          </a>
          <a
            href="https://www.instagram.com/mark_xu269/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="Instagram"
          >
            <RiInstagramLine size={20} />
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-200"
            aria-label="RSS"
          >
            <RiRssLine size={20} />
          </a>
        </div>
        <p>
          &copy; {year} Mark Xu. Built with Astro & React.
        </p>
      </div>
    </footer>
  )
}
