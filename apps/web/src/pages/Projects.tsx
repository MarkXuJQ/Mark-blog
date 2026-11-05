import type { IconType } from 'react-icons'
import { motion, useReducedMotion } from 'framer-motion'
import { IoGameController } from 'react-icons/io5'
import { LuGithub } from 'react-icons/lu'
import { RiComputerLine } from 'react-icons/ri'
import { useTranslation } from 'react-i18next'
import projectContent from '@content/projects/projects.json'
import { Seo } from '@/app/seo/Seo'
import { GithubShowcase } from '@/components/ui/github-showcase'
import { ProjectWebglGallery } from '@/components/ui/project-webgl-gallery'
import { TextRevealBlock } from '@/components/ui/text-reveal-block'
import { useGithubStats } from '@/hooks/useGithubStats'

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

const WORDMARK_BLOCK_COLOR = '#ff5941'
const WORDMARK_SPEED_FACTOR = 0.8
const MARK_REVEAL_DURATION = 0.62 * WORDMARK_SPEED_FACTOR
const THE_REVEAL_DURATION = 0.68 * WORDMARK_SPEED_FACTOR
// 0 = start with MARK, 1 = wait until MARK has fully finished.
const THE_REVEAL_START_PROGRESS = 0.6
const THE_REVEAL_DELAY = MARK_REVEAL_DURATION * 2 * THE_REVEAL_START_PROGRESS
const ORIGINAL_REVEAL_DELAY = 2
const ORIGINAL_REVEAL_DURATION = 1.02
const ORIGINAL_TO_AVATAR_GAP = 0.3
const AVATAR_REVEAL_DELAY =
  ORIGINAL_REVEAL_DELAY + ORIGINAL_REVEAL_DURATION + ORIGINAL_TO_AVATAR_GAP

const PROJECT_LINK_ICONS: Record<ProjectLinkType, IconType> = {
  game: IoGameController,
  github: LuGithub,
  computer: RiComputerLine,
}

function OriginalReveal() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.span
      className="mark-lab-original"
      initial={shouldReduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : {
              delay: ORIGINAL_REVEAL_DELAY,
              duration: ORIGINAL_REVEAL_DURATION,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      aria-label="Original"
      role="img"
    >
      Original.
    </motion.span>
  )
}

function AvatarReveal() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="mark-lab-avatar-reveal" aria-label="Mark" role="img">
      <motion.img
        src="/images/IMG_1766.JPG"
        alt=""
        className="mark-lab-avatar"
        initial={
          shouldReduceMotion ? false : { clipPath: 'circle(0% at 50% 50%)' }
        }
        animate={{
          clipPath: [
            'circle(0% at 50% 50%)',
            'circle(68% at 50% 50%)',
            'circle(82% at 50% 50%)',
            'circle(75% at 50% 50%)',
          ],
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                delay: AVATAR_REVEAL_DELAY,
                duration: 0.6,
                times: [0, 0.58, 0.82, 1],
                ease: ['easeOut', 'easeInOut', 'easeOut'],
              }
        }
      />
    </div>
  )
}

export function Projects() {
  const { t, i18n } = useTranslation()
  const githubStats = useGithubStats()
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

      <header className="mark-lab-header overflow-visible pt-2 pb-20 sm:pt-4 md:pt-8 md:pb-32">
        <div className="mark-lab-wordmark">
          <h1 className="max-w-full text-slate-950 dark:text-slate-50">
            <span className="mark-lab-mark-row">
              <TextRevealBlock
                animateOnScroll={false}
                as="span"
                className="mark-lab-field mark-lab-title mark-lab-mark"
                blockColor={WORDMARK_BLOCK_COLOR}
                duration={MARK_REVEAL_DURATION}
                text="MARK"
              />
              <AvatarReveal />
            </span>
            <span className="mark-lab-second-line text-slate-950 dark:text-slate-50">
              <TextRevealBlock
                animateOnScroll={false}
                as="span"
                className="mark-lab-field mark-lab-title mark-lab-the"
                blockColor={WORDMARK_BLOCK_COLOR}
                delay={THE_REVEAL_DELAY}
                duration={THE_REVEAL_DURATION}
                text="THE"
              />
              <OriginalReveal />
            </span>
          </h1>
        </div>
      </header>

      <div className="mark-lab-github-wrap">
        <GithubShowcase
          data={githubStats.data}
          status={githubStats.status}
          strings={{
            title: t('projects.githubTitle'),
            description: t('projects.githubDescription'),
            moreOnGithub: t('projects.moreOnGithub'),
            totalLabel: t('projects.githubTotal'),
            streakLabel: t('projects.githubStreak'),
            daysLabel: t('projects.githubDays'),
            topReposLabel: t('projects.githubTopRepos'),
            emptyRepos: t('projects.githubEmpty'),
            demoHint: t('projects.githubDemoHint'),
            toggle3d: '3D',
            toggle2d: '2D',
            scrollLabel1: t('projects.githubScroll1'),
            scrollLabel2: t('projects.githubScroll2'),
            scrollLabel3: t('projects.githubScroll3'),
          }}
        />
      </div>

      <ProjectWebglGallery
        items={projects}
        title={t('projects.showcaseTitle')}
        description=""
        openLabel={t('projects.open')}
      />
    </div>
  )
}
