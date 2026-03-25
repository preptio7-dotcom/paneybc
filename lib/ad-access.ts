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
  if (pathname.startsWith('/admin') || pathname.startsWith('/sKy9108-3~620_admin')) {
    return 'admin-area'
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
  return null
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

export function shouldLoadAdsForContext(pathname: string, user: AdAccessUser) {
  return getAdEligibilityInfo(pathname, user).eligible
}
