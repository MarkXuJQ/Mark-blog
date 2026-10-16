import type { IconType } from 'react-icons'
import { IoGameController } from 'react-icons/io5'
import { LuGithub } from 'react-icons/lu'
import { RiComputerLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
import projectContent from '@content/projects/projects.json'
import { Seo } from '@/app/seo/Seo'
import {
  SqueezeCarousel,
  type SqueezeSlide,
} from '@/components/ui/carousel-squeeze'

type ProjectLocale = { zh: string; en: string }
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
  preview?: {
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

type ProjectLink = {
  href: string
  label: string
  icon: IconType
}
type ProjectCardData = {
  id: string
  title: string
  description: string
  preview?: RawProject['preview'] & { alt: string }
  links: ProjectLink[]
}

const PROJECT_LINK_ICONS: Record<ProjectLinkType, IconType> = {
  game: IoGameController,
  github: LuGithub,
  computer: RiComputerLine,
}

function ProjectOverlay({ project }: { project: ProjectCardData }) {
  return <span className="truncate">{project.title}</span>
}

function OriginalWordmark() {
  return (
    <span
      aria-label="Original"
      className="mark-lab-original"
      role="img"
    >
      Original.
    </span>
  )
}

function projectToSlide(project: ProjectCardData): SqueezeSlide {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    image: project.preview?.src,
    imageSrcSet: project.preview?.avifSrc,
    imageAlt: project.preview?.alt,
    imageObjectFit: project.preview?.objectFit,
    background: 'linear-gradient(135deg, #173b4a, #2e7ea3)',
    overlay: <ProjectOverlay project={project} />,
    actions: (
      <>
        {project.links.map((link) => {
          const LinkIcon = link.icon
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200/80 bg-white/75 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--sq-accent)] focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <LinkIcon className="size-4" aria-hidden="true" />
              <span>{link.label}</span>
            </a>
          )
        })}
      </>
    ),
  }
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
  const sections = (projectContent.sections as RawProjectSection[]).map(
    (section) => ({
      id: section.id,
      title: section.title[locale],
      projects: section.projects.map(
        (project): ProjectCardData => ({
          id: project.id,
          title: project.title[locale],
          description: project.description[locale],
          preview: project.preview
            ? { ...project.preview, alt: project.alt[locale] }
            : undefined,
          links: project.links.map((link) => ({
            href: localPreview && link.localHref ? link.localHref : link.href,
            label: t(`projects.${link.labelKey}`),
            icon: PROJECT_LINK_ICONS[link.type],
          })),
        })
      ),
    })
  )
  const projects = sections.flatMap((section) => section.projects)

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 md:py-10">
      <Seo
        title={t('projects.title')}
        description={t('projects.description')}
      />

      <header className="mark-lab-header overflow-visible pt-2 pb-14 sm:pt-4 md:pt-8 md:pb-24">
        <div className="mark-lab-wordmark">
          <h1 className="max-w-full text-slate-950 dark:text-slate-50">
            <span className="mark-lab-mark-row">
              <span className="mark-lab-field mark-lab-title mark-lab-mark">
                MARK
              </span>
              <img
                src="/images/IMG_1766.JPG"
                alt="Mark"
                className="mark-lab-avatar rounded-full object-cover ring-1 ring-slate-900/10 dark:ring-white/15"
              />
            </span>
            <span className="mark-lab-second-line text-slate-950 dark:text-slate-50">
              <span className="mark-lab-field mark-lab-title mark-lab-the">
                THE
              </span>
              <OriginalWordmark />
            </span>
          </h1>
        </div>
      </header>

      <div className="mt-2 md:mt-6">
        <SqueezeCarousel
          slides={projects.map(projectToSlide)}
          label={t('projects.title')}
          accent="var(--brand-600)"
          height="clamp(190px, 34cqi, 360px)"
          controls={false}
          autoplay={projects.length > 1}
        />
      </div>
    </div>
  )
}
