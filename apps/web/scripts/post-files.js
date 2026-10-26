import fs from 'node:fs'
import path from 'node:path'

const POST_LANGUAGE_DIRECTORIES = ['chinese', 'english']

export function collectMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return []

  const files = []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files.sort()
}

export function collectPostMarkdownFiles(postsDir) {
  if (!fs.existsSync(postsDir)) return []

  return fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === 'before-2026' || /^\d{4}$/.test(entry.name))
    )
    .flatMap((year) =>
      POST_LANGUAGE_DIRECTORIES.flatMap((language) =>
        collectMarkdownFiles(path.join(postsDir, year.name, language))
      )
    )
    .sort()
}
