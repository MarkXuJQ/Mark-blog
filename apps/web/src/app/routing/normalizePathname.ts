export function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}
