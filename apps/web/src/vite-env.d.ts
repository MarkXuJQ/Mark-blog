/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_BASE_URL: string
  readonly VITE_CF_IMAGE_TRANSFORMATIONS_ENABLED?: string
  readonly VITE_CF_IMAGE_TRANSFORM_HOSTS?: string
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
