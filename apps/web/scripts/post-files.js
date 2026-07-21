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
  return POST_LANGUAGE_DIRECTORIES.flatMap((directory) =>
    collectMarkdownFiles(path.join(postsDir, directory))
  )
}
