import type { IconType } from 'react-icons'
import { useState } from 'react'
import { IoGameController } from 'react-icons/io5'
import { LuGithub, LuRefreshCw } from 'react-icons/lu'
import { RiComputerLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
import projectContent from '@content/projects/projects.json'
import { Seo } from '@/app/seo/Seo'
import { Card } from '@/components/ui/Card'

type ProjectLocale = {
  zh: string
  en: string
}

type ProjectLinkType = 'game' | 'github' | 'computer'

type ProjectLabelKey = 'live' | 'source' | 'open'

type RawProjectLink = {
  type: ProjectLinkType
  href: string
  localHref?: string
  labelKey: ProjectLabelKey
}

type RawProject = {
  id: string
  title: ProjectLocale
  description: ProjectLocale
  alt: ProjectLocale
  preview: {
    src: string
    avifSrc?: string
    objectFit?: 'cover' | 'contain'
  }
  links: RawProjectLink[]
}

type RawProjectSection = {
  id: string
  title: ProjectLocale
  projects: RawProject[]
}

type ProjectPreview = {
  src: string
  avifSrc?: string
  alt: string
  objectFit?: 'cover' | 'contain'
  links: ProjectLink[]
}

type ProjectLink = {
  href: string
  label: string
  icon: IconType
}

type ProjectCardProps = {
  id: string
  title: string
  description: string
  preview?: ProjectPreview
}

type ProjectSectionProps = {
  id: string
  title: string
  projects: ProjectCardProps[]
  className?: string
}

const PROJECT_LINK_ICONS: Record<ProjectLinkType, IconType> = {
  game: IoGameController,
  github: LuGithub,
  computer: RiComputerLine,
}

function ProjectPreviewFrame({ preview }: { preview: ProjectPreview }) {
  const primaryLink = preview.links[0]

  return (
    <div className="relative overflow-hidden border-b border-slate-200/70 bg-slate-950 dark:border-white/8">
      <a
        href={primaryLink.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={primaryLink.label}
        className="block rounded-md focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:outline-none"
      >
        <picture className="block">
          {preview.avifSrc ? (
            <source srcSet={preview.avifSrc} type="image/avif" />
          ) : null}
          <img
            src={preview.src}
            alt={preview.alt}
            className={`aspect-[16/10] w-full ${preview.objectFit === 'contain' ? 'object-contain' : 'object-cover object-top'} transition-transform duration-500 ease-out group-hover:scale-[1.025]`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />
      </a>
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-2">
        {preview.links.map((link) => {
          const LinkIcon = link.icon

          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-slate-950/80 text-white shadow-lg backdrop-blur-sm transition-[transform,box-shadow,background-color] duration-300 group-hover:-translate-y-0.5 hover:-translate-y-0.5 hover:bg-slate-950 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
            >
              <LinkIcon className="h-5 w-5" aria-hidden="true" />
            </a>
          )
        })}
      </div>
    </div>
  )
}

function FlipCornerButton({
  isFlipped,
  isPinned,
  onToggle,
}: {
  isFlipped: boolean
  isPinned: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      aria-label={isFlipped ? t('projects.flipBack') : t('projects.flip')}
      aria-pressed={isPinned}
      className="absolute right-0 bottom-0 z-20 flex h-14 w-14 items-end justify-end overflow-hidden bg-gradient-to-br from-slate-700/30 via-slate-950/85 to-slate-950 p-2.5 text-white drop-shadow-[0_6px_10px_rgba(15,23,42,0.24)] transition-[filter,background] duration-300 [clip-path:polygon(100%_0,100%_100%,0_100%)] before:pointer-events-none before:absolute before:top-0 before:right-0 before:h-px before:w-16 before:origin-right before:-rotate-45 before:bg-white/35 before:content-[''] after:pointer-events-none after:absolute after:top-1 after:right-1 after:h-px after:w-14 after:origin-right after:-rotate-45 after:bg-white/10 after:content-[''] hover:from-slate-600/40 hover:to-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500/80 focus-visible:outline-none dark:from-white/25 dark:via-slate-950/75 dark:to-slate-950 dark:hover:from-white/35"
      onClick={onToggle}
    >
      <LuRefreshCw
        className={`relative z-10 h-4 w-4 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </button>
  )
}

function ProjectCard({ title, description, preview }: ProjectCardProps) {
  const [isPinned, setIsPinned] = useState(false)
  const isFlipped = isPinned

  return (
    <div className="group relative [perspective:1200px]">
      <div
        className="relative transition-transform duration-700 ease-out [transform-style:preserve-3d]"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : undefined }}
      >
        <Card
          as="article"
          aria-hidden={isFlipped}
          className={`group relative flex flex-col self-start overflow-hidden p-0 transition-[transform,box-shadow] ease-out focus-within:-translate-y-1 focus-within:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.5)] hover:-translate-y-1 hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.5)] sm:p-0 dark:border-0 dark:shadow-none ${isFlipped ? 'pointer-events-none' : ''} [backface-visibility:hidden]`}
        >
          {preview ? <ProjectPreviewFrame preview={preview} /> : null}
          <h2 className="p-4 pr-16 text-xl font-bold tracking-tight text-slate-900 sm:p-6 dark:text-slate-100">
            {title}
          </h2>
          <FlipCornerButton
            isFlipped={isFlipped}
            isPinned={isPinned}
            onToggle={() => setIsPinned((value) => !value)}
          />
        </Card>
        <Card
          as="article"
          aria-hidden={!isFlipped}
          className={`absolute inset-0 flex min-h-full flex-col justify-between overflow-hidden p-5 transition-[transform,box-shadow] sm:p-6 dark:border-0 dark:shadow-none ${isFlipped ? '' : 'pointer-events-none'} [transform:rotateY(180deg)] [backface-visibility:hidden]`}
        >
          <div>
            <h2 className="pr-8 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <p className="mt-5 leading-relaxed text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
          <FlipCornerButton
            isFlipped={isFlipped}
            isPinned={isPinned}
            onToggle={() => setIsPinned((value) => !value)}
          />
        </Card>
      </div>
    </div>
  )
}

function ProjectSection({
  id,
  title,
  projects,
  className,
}: ProjectSectionProps) {
  return (
    <section className={className} aria-labelledby={id}>
      <h2
        id={id}
        className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100"
      >
        {title}
      </h2>
      <div className="isolate -my-12 flex snap-x snap-mandatory gap-5 overflow-x-auto py-12">
        {projects.map((project) => (
          <div
            key={project.id}
            className="relative z-0 w-[min(70vw,27rem)] shrink-0 snap-start focus-within:z-20 hover:z-20 md:w-[42.5%]"
          >
            <ProjectCard {...project} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function Projects() {
  const { t, i18n } = useTranslation()
  const localPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  const locale: 'zh' | 'en' = i18n.resolvedLanguage?.startsWith('zh')
    ? 'zh'
    : 'en'
  const sections: ProjectSectionProps[] = (
    projectContent.sections as RawProjectSection[]
  ).map((section) => ({
    id: section.id,
    title: section.title[locale],
    projects: section.projects.map((project) => ({
      id: project.id,
      title: project.title[locale],
      description: project.description[locale],
      preview: {
        ...project.preview,
        alt: project.alt[locale],
        links: project.links.map((link) => ({
          href: localPreview && link.localHref ? link.localHref : link.href,
          label: t(`projects.${link.labelKey}`),
          icon: PROJECT_LINK_ICONS[link.type],
        })),
      },
    })),
  }))

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 md:py-14">
      <Seo
        title={t('projects.title')}
        description={t('projects.description')}
      />

      <div className="space-y-10 md:space-y-12">
        {sections.map((section) => (
          <ProjectSection
            key={section.id}
            id={`projects-${section.id}`}
            title={section.title}
            projects={section.projects}
            className="w-full"
          />
        ))}
      </div>
    </div>
  )
}
