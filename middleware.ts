import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { applySecurityHeaders } from '@/lib/security-headers'
import { neon } from '@neondatabase/serverless'

const BLOCKED_MESSAGE =
  'Access Denied. Your IP address has been blocked due to suspicious activity. If you believe this is an error, contact support@preptio.com'

async function fetchMaintenanceMode(request: NextRequest) {
  try {
    const statusUrl = new URL('/api/public/maintenance-status', request.url)
    const response = await fetch(statusUrl, {
      cache: 'no-store',
      headers: {
        'x-preptio-internal': '1',
      },
    })

    if (!response.ok) return false
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return false

    const payload = await response.json()
    return Boolean(payload?.isMaintenanceMode)
  } catch (error) {
    console.error('Maintenance check failed', error)
    return false
  }
}

// ─── Per-IP in-process cache (15s TTL) ────────────────────────────────────────
const ipCache = new Map<string, { result: { isBlocked: boolean; blockedReason?: string }; expiresAt: number }>()

function normalizeIp(raw: string) {
  return raw.split(',')[0].trim().replace(/^::ffff:/i, '')
}

async function fetchIpAccessStatus(request: NextRequest) {
  const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || ''
  const ip = normalizeIp(rawIp)
  if (!ip) return { isBlocked: false }

  const cached = ipCache.get(ip)
  if (cached && Date.now() < cached.expiresAt) return cached.result

  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Check whitelist first — whitelisted IPs are never blocked
    const whitelist = await sql`SELECT 1 FROM whitelisted_ips WHERE ip_address = ${ip} LIMIT 1`
    if (whitelist.length > 0) {
      const result = { isBlocked: false }
      ipCache.set(ip, { result, expiresAt: Date.now() + 15_000 })
      return result
    }

    // Check exact IP block
    const blocked = await sql`SELECT reason FROM blocked_ips WHERE ip_address = ${ip} AND is_active = true LIMIT 1`
    if (blocked.length > 0) {
      const result = { isBlocked: true, blockedReason: String(blocked[0].reason || '') }
      ipCache.set(ip, { result, expiresAt: Date.now() + 15_000 })
      return result
    }

    // Check subnet blocks (/24) — extract first 3 octets and match
    const parts = ip.split('.')
    if (parts.length === 4) {
      const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
      const subnetBlocked = await sql`SELECT reason FROM blocked_ips WHERE ip_address = ${subnetPrefix} AND is_active = true AND is_subnet = true LIMIT 1`
      if (subnetBlocked.length > 0) {
        const result = { isBlocked: true, blockedReason: String(subnetBlocked[0].reason || '') }
        ipCache.set(ip, { result, expiresAt: Date.now() + 15_000 })
        return result
      }
    }

    const result = { isBlocked: false }
    ipCache.set(ip, { result, expiresAt: Date.now() + 15_000 })
    return result
  } catch (error) {
    console.error('Blocked IP check failed', error)
    return { isBlocked: false }
  }
}

function blockedHtmlResponse() {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access Denied</title><style>body{font-family:Arial,sans-serif;background:#f8fafb;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;color:#1a202c}.card{max-width:640px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;box-shadow:0 12px 24px rgba(15,23,42,.08)}h1{margin:0 0 12px;font-size:28px;color:#0f7938}p{margin:0;line-height:1.6;color:#4a5568}</style></head><body><div class="card"><h1>Access Denied</h1><p>${BLOCKED_MESSAGE}</p></div></body></html>`,
    {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const superAdminToken = request.cookies.get('super_admin_session')?.value
  const { pathname } = request.nextUrl

  const isAuthPage = pathname.startsWith('/auth')
  const isAdminLoginPage = pathname === '/admin/login'
  const isAdminForgotPasswordPage = pathname === '/admin/forgot-password'
  const isAdminRoute = pathname.startsWith('/admin') && !isAdminLoginPage && !isAdminForgotPasswordPage
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || (pathname.startsWith('/admin') && !isAdminLoginPage && !isAdminForgotPasswordPage)
  const isSecretAdminRoute = pathname.startsWith('/sKy9108-3~620_admin')
  const isSecretAdminLoginPage = pathname === '/sKy9108-3~620_admin/login'
  const isSecretAdminLogoutPage = pathname === '/sKy9108-3~620_admin/logout'

  const isMaintenancePage = pathname === '/maintenance'
  const isUnsupportedPage = pathname === '/unsupported-device'
  const isApiRoute = pathname.startsWith('/api')
  const isPublicApi = pathname.startsWith('/api/public')
  const isStaticAsset = pathname.startsWith('/_next') || pathname.includes('.')

  const isInternalBypassRoute =
    pathname.startsWith('/api/public/maintenance-status') || pathname.startsWith('/api/public/ip-security/access')

  if (isInternalBypassRoute || pathname.startsWith('/practice') || pathname.startsWith('/api/practice-mcqs')) {
    return applySecurityHeaders(NextResponse.next(), request)
  }

  // Global blocked-IP enforcement for all routes and endpoints.
  if (!isStaticAsset) {
    const ipAccess = await fetchIpAccessStatus(request)
    if (ipAccess.isBlocked) {
      if (isApiRoute) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: BLOCKED_MESSAGE,
            },
            { status: 403 }
          ),
          request
        )
      }

      return applySecurityHeaders(blockedHtmlResponse(), request)
    }
  }

  let isMaintenanceMode = false
  if (!isApiRoute && !isPublicApi && !isStaticAsset) {
    isMaintenanceMode = await fetchMaintenanceMode(request)
  }

  if (!isApiRoute && !isSecretAdminRoute && !isMaintenancePage && !isUnsupportedPage && !isPublicApi && !isStaticAsset) {
    if (isMaintenanceMode) {
      return applySecurityHeaders(NextResponse.rewrite(new URL('/maintenance', request.url)), request)
    }
  }

  if (!isApiRoute && isAuthPage && !pathname.startsWith('/auth/reset-password') && token) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), request)
  }

  if (!isApiRoute && isProtectedRoute && !token) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)), request)
  }

  if (!isApiRoute && isAdminRoute && token) {
    try {
      const meUrl = new URL('/api/auth/me', request.url)
      const meResponse = await fetch(meUrl, {
        cache: 'no-store',
        headers: {
          cookie: request.headers.get('cookie') || '',
          'x-preptio-internal': '1',
        },
      })
      if (!meResponse.ok) {
        return applySecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)), request)
      }
      const meData = await meResponse.json()
      const role = meData?.user?.role
      if (role !== 'admin' && role !== 'super_admin') {
        return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)), request)
      }
    } catch (error) {
      console.error('Admin role check failed', error)
      return applySecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)), request)
    }
  }

  if (!isApiRoute && isSecretAdminRoute && !isSecretAdminLoginPage && !isSecretAdminLogoutPage && !superAdminToken) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/sKy9108-3~620_admin/login', request.url)), request)
  }

  if (!isApiRoute && isSecretAdminLoginPage && superAdminToken) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/sKy9108-3~620_admin/dashboard', request.url)), request)
  }

  return applySecurityHeaders(NextResponse.next(), request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - practice (public practice page)
     * - api/practice-mcqs (public API)
     * - favicon.ico, sitemap.xml, robots.txt, sw.js (standard public files)
     * - file extensions: .*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js)
     */
    '/((?!_next/static|_next/image|practice|api/practice-mcqs|favicon.ico|sitemap.xml|robots.txt|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js)).*)',
  ],
}
