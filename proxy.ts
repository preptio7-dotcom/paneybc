import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isPakistanRequest } from '@/lib/geo'
import { DEFAULT_GEO_RESTRICTION_SETTINGS } from '@/lib/geo-restriction'

export default async function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value
    const superAdminToken = request.cookies.get('super_admin_session')?.value
    const { pathname } = request.nextUrl

    // Define public and private routes
    const isAuthPage = pathname.startsWith('/auth')
    const isAdminLoginPage = pathname === '/admin/login'
    const isAdminForgotPasswordPage = pathname === '/admin/forgot-password'
    const isAdminRoute = pathname.startsWith('/admin') && !isAdminLoginPage && !isAdminForgotPasswordPage
    const isProtectedRoute = pathname.startsWith('/dashboard') || (pathname.startsWith('/admin') && !isAdminLoginPage && !isAdminForgotPasswordPage)
    const isSecretAdminRoute = pathname.startsWith('/sKy9108-3~620_admin')
    const isSecretAdminLoginPage = pathname === '/sKy9108-3~620_admin/login'
    const isSecretAdminLogoutPage = pathname === '/sKy9108-3~620_admin/logout'

    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    const isMaintenancePage = pathname === '/maintenance'
    const isUnsupportedPage = pathname === '/unsupported-device'
    const isUnsupportedRegionPage = pathname === '/unsupported-region'
    const isPublicApi = pathname.startsWith('/api/public')
    const isStaticAsset = pathname.startsWith('/_next') || pathname.includes('.')

    let isMaintenanceMode = false
    let pakistanOnly = DEFAULT_GEO_RESTRICTION_SETTINGS.pakistanOnly

    // Load public runtime flags used by proxy (maintenance + geo restriction)
    if (!isPublicApi && !isStaticAsset) {
        try {
            const statusUrl = new URL('/api/public/maintenance-status', request.url)
            const res = await fetch(statusUrl, { cache: 'no-store' })

            if (res.ok) {
                const contentType = res.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                    const payload = await res.json()
                    isMaintenanceMode = Boolean(payload?.isMaintenanceMode)
                    const payloadPakistanOnly = payload?.geoRestriction?.pakistanOnly
                    if (typeof payloadPakistanOnly === 'boolean') {
                        pakistanOnly = payloadPakistanOnly
                    }
                }
            }
        } catch (err) {
            console.error('Maintenance check failed', err)
        }
    }

    // 0. Country restriction (Pakistan only, admin configurable)
    if (
        pakistanOnly &&
        !isUnsupportedRegionPage &&
        !isMaintenancePage &&
        !isUnsupportedPage &&
        !isPublicApi &&
        !isStaticAsset
    ) {
        const geo = isPakistanRequest(request, { pakistanOnly })
        if (!geo.allowed) {
            return NextResponse.rewrite(new URL('/unsupported-region', request.url))
        }
    }

    // 1. Maintenance Mode check (STRICT PRIORITY)
    // Must come before mobile block so mobile users see maintenance if site is down
    if (!isSecretAdminRoute && !isMaintenancePage && !isUnsupportedPage && !isPublicApi && !isStaticAsset) {
        if (isMaintenanceMode) {
            return NextResponse.rewrite(new URL('/maintenance', request.url))
        }
    }

    // 2. Mobile restriction - DISABLED per user request
    // Site is now accessible from all devices
    // if (isMobile && !isSecretAdminRoute && !isMaintenancePage && !isUnsupportedPage && !pathname.startsWith('/_next') && !pathname.includes('.')) {
    //     return NextResponse.rewrite(new URL('/unsupported-device', request.url))
    // }

    // AUTH & PROTECTION
    // If the user is on an auth page (excluding reset password) and has a token, redirect to dashboard
    // We allow reset-password access even if logged in, so they can reset via email link
    if (isAuthPage && !pathname.startsWith('/auth/reset-password') && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // If the user is on a protected route and has no token, redirect to login
    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Role protection for admin pages
    if (isAdminRoute && token) {
        try {
            const meUrl = new URL('/api/auth/me', request.url)
            const meResponse = await fetch(meUrl, {
                cache: 'no-store',
                headers: {
                    cookie: request.headers.get('cookie') || '',
                },
            })
            if (!meResponse.ok) {
                return NextResponse.redirect(new URL('/auth/login', request.url))
            }
            const meData = await meResponse.json()
            const role = meData?.user?.role
            if (role !== 'admin' && role !== 'super_admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        } catch (error) {
            console.error('Admin role check failed', error)
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }
    }

    // Super Admin Protection
    if (isSecretAdminRoute && !isSecretAdminLoginPage && !isSecretAdminLogoutPage && !superAdminToken) {
        return NextResponse.redirect(new URL('/sKy9108-3~620_admin/login', request.url))
    }

    // Redirect Super Admin if already logged in and visiting login page
    if (isSecretAdminLoginPage && superAdminToken) {
        return NextResponse.redirect(new URL('/sKy9108-3~620_admin/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)',
    ],
}
