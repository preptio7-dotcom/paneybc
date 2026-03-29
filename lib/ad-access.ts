type AdAccessUser =
  | {
      role?: 'student' | 'admin' | 'super_admin' | string
      studentRole?: 'user' | 'unpaid' | 'paid' | 'ambassador' | string
    }
  | null
  | undefined

export type AdEligibilityInfo = {
  canShowByUser: boolean
  blockedByUserReason: string | null
  blockedByRouteReason: string | null
  eligible: boolean
  reason: string
}

const subjectAssessmentPattern = /^\/subjects\/[^/]+\/(test|practice)(\/|$)/i
const financialPracticePattern = /^\/financial-statements\/practice\/[^/]+(\/|$)/i
const financialResultsPattern = /^\/financial-statements\/results\/[^/]+(\/|$)/i

export function isAuthRoute(pathname: string) {
  return pathname.startsWith('/auth') || pathname === '/login' || pathname === '/register'
}

export function isAssessmentRoute(pathname: string) {
  return (
    pathname === '/test' ||
    pathname === '/custom-test' ||
    pathname === '/weak-area' ||
    pathname === '/wrong-answers/test' ||
    subjectAssessmentPattern.test(pathname) ||
    financialPracticePattern.test(pathname)
  )
}

export function isResultRoute(pathname: string) {
  return pathname === '/results' || financialResultsPattern.test(pathname)
}

export function getRouteAdRestrictionReason(pathname: string): string | null {
  // ONLY allow the specific paths mentioned by the user
  const isHomePage = pathname === '/'
  const isBlogPage = pathname === '/blog' || pathname.startsWith('/blog/')
  
  if (isHomePage || isBlogPage) {
    return null // Eligible
  }

  // Block everything else
  if (pathname.startsWith('/admin') || pathname.startsWith('/sKy9108-3~620_admin')) {
    return 'admin-area'
  }
  if (pathname.startsWith('/dashboard')) {
    return 'dashboard-area'
  }
  if (isAuthRoute(pathname)) {
    return 'auth-page'
  }
  if (isAssessmentRoute(pathname)) {
    return 'active-test-session'
  }
  if (isResultRoute(pathname)) {
    return 'results-page'
  }
  
  return 'restricted-path'
}

export function isRouteBlockedForAds(pathname: string) {
  return getRouteAdRestrictionReason(pathname) !== null
}

export function getUserAdRestrictionReason(user: AdAccessUser): string | null {
  if (!user) return null
  if (user.role === 'admin' || user.role === 'super_admin') return 'admin-role'
  const studentRole = user.studentRole || 'unpaid'
  if (studentRole === 'unpaid') return null
  if (studentRole === 'paid') return 'paid-role'
  if (studentRole === 'ambassador') return 'ambassador-role'
  return `blocked-student-role:${studentRole}`
}

export function canUserSeeAds(user: AdAccessUser) {
  return getUserAdRestrictionReason(user) === null
}

export function getAdEligibilityInfo(pathname: string, user: AdAccessUser): AdEligibilityInfo {
  const blockedByUserReason = getUserAdRestrictionReason(user)
  const blockedByRouteReason = getRouteAdRestrictionReason(pathname)
  const canShowByUser = blockedByUserReason === null
  const eligible = canShowByUser && blockedByRouteReason === null

  let reason = 'eligible'
  if (blockedByUserReason) {
    reason = `user:${blockedByUserReason}`
  } else if (blockedByRouteReason) {
    reason = `route:${blockedByRouteReason}`
  }

  return {
    canShowByUser,
    blockedByUserReason,
    blockedByRouteReason,
    eligible,
    reason,
  }
}

export type AdSenseConfig = {
    globalEnabled: boolean
    allowedPaths: string[]
    blockedPaths: string[]
    showAdsToUnpaid: boolean
    showAdsToPaid: boolean
    showAdsToAmbassador: boolean
}

function matchPathPattern(pathname: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.split('*').join('.*') + '$', 'i')
    return regex.test(pathname)
}

export function shouldLoadAdsForContext(
    pathname: string,
    user: AdAccessUser,
    config: AdSenseConfig | null = null
) {
    // If no config, fallback to default logic
    if (!config) {
        return getAdEligibilityInfo(pathname, user).eligible
    }

    if (!config.globalEnabled) return false

    // Check user role first
    if (user?.role === 'admin' || user?.role === 'super_admin') return false

    const studentRole = user?.studentRole || 'unpaid'
    if (studentRole === 'paid' && !config.showAdsToPaid) return false
    if (studentRole === 'ambassador' && !config.showAdsToAmbassador) return false
    if (studentRole === 'unpaid' && !config.showAdsToUnpaid) return false
    if (studentRole === 'user' && !config.showAdsToUnpaid) return false

    // Then check paths
    const isBlocked = config.blockedPaths.some(pattern => matchPathPattern(pathname, pattern))
    if (isBlocked) return false

    const isAllowed = config.allowedPaths.some(pattern => matchPathPattern(pathname, pattern))
    return isAllowed
}
