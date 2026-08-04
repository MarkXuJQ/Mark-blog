import type { IconType } from 'react-icons'
import { IoGameController } from 'react-icons/io5'
import { LuGithub } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { Seo } from '@/app/seo/Seo'

type ProjectPreview = {
  src: string
  alt: string
  href?: string
  hrefLabel?: string
  icon?: IconType
}

type ProjectCardProps = {
  title: string
  preview?: ProjectPreview
}

function ProjectPreviewFrame({ preview }: { preview: ProjectPreview }) {
  const PreviewIcon = preview.icon
  const content = (
    <div className="relative -mx-5 -mt-5 mb-6 overflow-hidden rounded-md border border-slate-200/70 bg-slate-950 sm:-mx-6 sm:-mt-6 dark:border-slate-700/70">
      <img
        src={preview.src}
        alt={preview.alt}
        className="aspect-[16/10] w-full object-cover object-top"
        loading="lazy"
      />
      {preview.href ? (
        <span
          className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-slate-950/80 text-white shadow-lg backdrop-blur-sm"
          title={preview.hrefLabel}
          aria-label={preview.hrefLabel}
        >
          {PreviewIcon ? (
            <PreviewIcon className="h-5 w-5" aria-hidden="true" />
          ) : null}
        </span>
      ) : null}
    </div>
  )

  if (!preview.href) return content

  return (
    <a
      href={preview.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={preview.hrefLabel}
      className="block transition-opacity hover:opacity-90"
    >
      {content}
    </a>
  )
}

function ProjectCard({ title, preview }: ProjectCardProps) {
  return (
    <article className="group flex flex-col self-start rounded-lg border border-slate-200/70 bg-white/75 p-5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.38)] backdrop-blur transition-[transform,box-shadow,border-color] duration-300 sm:p-6 dark:border-slate-700/50 dark:bg-[#17191c]/90 dark:shadow-none">
      {preview ? <ProjectPreviewFrame preview={preview} /> : null}
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
    </article>
  )
}

export function Projects() {
  const { t } = useTranslation()
  const localPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  const fingerBlockUrl = localPreview
    ? 'https://finger-block.vercel.app/'
    : '/lab/fingerblock/'

  const projects: ProjectCardProps[] = [
    {
      title: t('projects.cards.fingerblock.title'),
      preview: {
        src: '/images/fingerblock-preview.png',
        alt: t('projects.cards.fingerblock.alt'),
        href: fingerBlockUrl,
        hrefLabel: t('projects.live'),
        icon: IoGameController,
      },
    },
    {
      title: t('projects.cards.website.title'),
      preview: {
        src: '/images/mark-blog-preview.png',
        alt: t('projects.cards.website.alt'),
        href: 'https://github.com/MarkXuJQ/Mark-blog',
        hrefLabel: t('projects.source'),
        icon: LuGithub,
      },
    },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 md:py-14">
      <Seo
        title={t('projects.title')}
        description={t('projects.description')}
      />

      <section
        className="mt-10 grid gap-5 md:grid-cols-2"
        aria-label={t('projects.title')}
      >
        {projects.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </section>
    </div>
  )
}
