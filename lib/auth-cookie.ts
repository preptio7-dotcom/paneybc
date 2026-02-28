import type { NextResponse } from 'next/server'

type ClearAuthCookieOptions = {
  cookieName: string
  isProd: boolean
  host?: string | null
  configuredDomain?: string | null
}

function normalizeDomain(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
}

function isIpv4(host: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

function collectDomainCandidates(host?: string | null, configuredDomain?: string | null) {
  const candidates = new Set<string>()
  const normalizedConfigured = normalizeDomain(configuredDomain)
  const normalizedHost = normalizeDomain(host)

  if (normalizedConfigured) {
    candidates.add(normalizedConfigured)
  }

  if (normalizedHost && normalizedHost !== 'localhost' && !isIpv4(normalizedHost)) {
    const parts = normalizedHost.split('.').filter(Boolean)
    if (parts.length >= 2) {
      for (let i = 0; i <= parts.length - 2; i += 1) {
        const domain = parts.slice(i).join('.')
        if (domain.includes('.')) {
          candidates.add(domain)
        }
      }
    }
  }

  return Array.from(candidates)
}

export function clearAuthCookie(response: NextResponse, options: ClearAuthCookieOptions) {
  const { cookieName, isProd, host, configuredDomain } = options
  const serializeCookie = (domain?: string) => {
    const parts = [
      `${cookieName}=`,
      'Path=/',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'Max-Age=0',
      'HttpOnly',
      'SameSite=Lax',
    ]
    if (isProd) parts.push('Secure')
    if (domain) parts.push(`Domain=${domain}`)
    return parts.join('; ')
  }

  // Host-only cookie clear
  response.headers.append('Set-Cookie', serializeCookie())

  // Domain cookie clears (if present)
  const domains = collectDomainCandidates(host, configuredDomain)
  const emitted = new Set<string>()
  for (const domain of domains) {
    const normalized = normalizeDomain(domain)
    if (!normalized || emitted.has(normalized)) continue
    emitted.add(normalized)
    response.headers.append('Set-Cookie', serializeCookie(normalized))
    response.headers.append('Set-Cookie', serializeCookie(`.${normalized}`))
  }
}
