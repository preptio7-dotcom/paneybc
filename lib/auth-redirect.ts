/** Only allow local application paths, never another origin or an auth loop. */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || value !== value.trim()) return null
  let decoded = value
  try {
    for (let i = 0;i < 3;i++) {
      if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return null
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return null
    const url = new URL(decoded, 'https://preptio.invalid')
    if (url.origin !== 'https://preptio.invalid' || /^\/(?:auth|api)(?:\/|$)/i.test(url.pathname)) return null
    return value
  } catch {
    return null
  }
}

export function authDestination(search: string, role?: string, orgRole?: string | null) {
  const returnTo = safeReturnTo(new URLSearchParams(search).get('returnTo'))
  if (returnTo) return returnTo

  if (role === 'admin' || role === 'super_admin') return '/admin'
  if (orgRole === 'admin' || orgRole === 'owner') return '/org'
  return '/dashboard'
}

export function authHref(kind: 'login' | 'signup', destination?: string | null) {
  const safe = safeReturnTo(destination)
  return `/auth/${kind}${safe ? `?${new URLSearchParams({ returnTo: safe })}` : ''}`
}
