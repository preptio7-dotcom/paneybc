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
  const baseCookie = {
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
  }

  // Host-only cookie
  response.cookies.set(cookieName, '', baseCookie)

  const domains = collectDomainCandidates(host, configuredDomain)
  for (const domain of domains) {
    response.cookies.set(cookieName, '', { ...baseCookie, domain })
    response.cookies.set(cookieName, '', { ...baseCookie, domain: `.${domain}` })
  }
}
