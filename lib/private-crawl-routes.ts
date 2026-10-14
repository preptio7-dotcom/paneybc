const PRIVATE_PREFIXES = [
  '/admin',
  '/superadmin',
  '/sKy9108-3~620_admin',
  '/dashboard',
  '/org',
  '/results',
  '/review',
  '/weak-area',
  '/wrong-answers',
  '/custom-quiz',
  '/custom-test',
  '/exam-simulator',
  '/notes',
  '/study-planner',
  '/study-session',
  '/financial-statements',
]

export function isPrivateCrawlPath(pathname: string) {
  if (!pathname) return false

  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
