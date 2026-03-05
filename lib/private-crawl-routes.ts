// Internal route patterns used for crawl/index suppression headers.
// This file is server-side only and not exposed as a public endpoint.
const PRIVATE_PREFIXES = [
  '/admin',
  '/superadmin',
  '/sKy9108-3~620_admin',
  '/api',
  '/dashboard',
  '/settings',
  '/profile',
  '/auth',
  '/practice',
  '/results',
  '/review',
  '/study-session',
  '/study-planner',
  '/notes',
  '/analytics',
  '/weak-area',
  '/exam-simulator',
  '/financial-statements',
  '/custom-test',
  '/custom-quiz',
  '/test',
  '/cron',
  '/staging',
  '/dev',
]

const SUBJECT_INTERNAL_REGEX = /^\/subjects\/[^/]+\/(practice|test)(?:\/|$)/i
const PUBLIC_CRAWL_EXCEPTIONS = ['/auth/login', '/auth/signup']

export function isPrivateCrawlPath(pathname: string) {
  if (!pathname) return false

  if (PUBLIC_CRAWL_EXCEPTIONS.some((route) => pathname === route)) {
    return false
  }

  if (SUBJECT_INTERNAL_REGEX.test(pathname)) return true

  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
