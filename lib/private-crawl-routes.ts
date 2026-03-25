const PRIVATE_PREFIXES = [
  '/admin',
  '/superadmin',
  '/dashboard',
]

export function isPrivateCrawlPath(pathname: string) {
  if (!pathname) return false

  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
