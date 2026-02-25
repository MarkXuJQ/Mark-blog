/// <reference types="vite/client" />

declare module '*.md' {
  const attributes: Record<string, unknown>
  const html: string
  const toc: { level: string; content: string }[]
  export { attributes, html, toc }
}
