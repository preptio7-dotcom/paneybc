import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value
    const superAdminToken = request.cookies.get('super_admin_session')?.value
    const { pathname } = request.nextUrl

    // Define public and private routes
    const isAuthPage = pathname.startsWith('/auth')
    const isAdminLoginPage = pathname === '/admin/login'
    const isAdminForgotPasswordPage = pathname === '/admin/forgot-password'
    const isProtectedRoute = pathname.startsWith('/dashboard') || (pathname.startsWith('/admin') && !isAdminLoginPage && !isAdminForgotPasswordPage)
    const isSecretAdminRoute = pathname.startsWith('/sKy9108-3~620_admin')
    const isSecretAdminLoginPage = pathname === '/sKy9108-3~620_admin/login'
    const isSecretAdminLogoutPage = pathname === '/sKy9108-3~620_admin/logout'

    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    const isMaintenancePage = pathname === '/maintenance'
    const isUnsupportedPage = pathname === '/unsupported-device'
    const isPublicApi = pathname.startsWith('/api/public')

    // 1. Maintenance Mode check (STRICT PRIORITY)
    // Must come before mobile block so mobile users see maintenance if site is down
    if (!isSecretAdminRoute && !isMaintenancePage && !isUnsupportedPage && !isPublicApi && !pathname.startsWith('/_next') && !pathname.includes('.')) {
        try {
            // Check maintenance status (we fetch internal API)
            // Note: Request.url origin is used for absolute URL
            const statusUrl = new URL('/api/public/maintenance-status', request.url)
            const res = await fetch(statusUrl, { cache: 'no-store' })

            if (!res.ok) {
                return NextResponse.next()
            }

            const contentType = res.headers.get('content-type') || ''
            if (!contentType.includes('application/json')) {
                return NextResponse.next()
            }

            const { isMaintenanceMode } = await res.json()
            if (isMaintenanceMode) {
                return NextResponse.rewrite(new URL('/maintenance', request.url))
            }
        } catch (err) {
            console.error('Maintenance check failed', err)
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
