import process from 'node:process'
import { spawnSync } from 'node:child_process'

const RELEVANT_PATHS = [
  'apps/web',
  'content',
  'packages',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
]

function git(args, options = {}) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    shell: false,
    cwd: REPOSITORY_ROOT,
    ...options,
  })
}

function resolveRepositoryRoot() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    shell: false,
  })

  return result.status === 0 && result.stdout.trim()
    ? result.stdout.trim()
    : process.cwd()
}

const REPOSITORY_ROOT = resolveRepositoryRoot()

function commitExists(reference) {
  if (!reference) return false
  return git(['cat-file', '-e', `${reference}^{commit}`]).status === 0
}

function resolveHead() {
  const vercelCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim()
  return commitExists(vercelCommit) ? vercelCommit : 'HEAD'
}

function resolveBase(head) {
  const previousCommit = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim()
  if (commitExists(previousCommit)) return previousCommit

  const parent = `${head}^`
  return commitExists(parent) ? parent : null
}

const head = resolveHead()
const base = resolveBase(head)

if (!base) {
  console.log(
    'No previous commit is available for comparison; continuing with the Vercel build.'
  )
  process.exitCode = 1
} else {
  const diff = git(['diff', '--quiet', base, head, '--', ...RELEVANT_PATHS])

  if (diff.status === 0) {
    console.log(
      `No deployment-relevant changes detected between ${base} and ${head}; skipping the Vercel build.`
    )
    process.exitCode = 0
  } else if (diff.status === 1) {
    console.log(
      `Deployment-relevant changes detected between ${base} and ${head}; continuing with the Vercel build.`
    )
    process.exitCode = 1
  } else {
    const detail = diff.stderr?.trim() || `git diff exited with ${diff.status}`
    console.warn(
      `Unable to check changed paths (${detail}); continuing safely.`
    )
    process.exitCode = 1
  }
}
