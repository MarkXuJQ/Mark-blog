/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_BASE_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.md' {
  const attributes: Record<string, unknown>
  const html: string
  const toc: { level: string; content: string }[]
  export { attributes, html, toc }
}
