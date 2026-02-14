import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST() {
    try {
        const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
        const cookieDomain = process.env.COOKIE_DOMAIN
        const isProd = process.env.NODE_ENV === 'production'
        const baseCookie = {
            httpOnly: true,
            maxAge: 0,
            sameSite: 'strict' as const,
            secure: isProd,
            path: '/',
        }

        response.cookies.delete('super_admin_session')
        response.cookies.set('super_admin_session', '', { ...baseCookie, expires: new Date(0) })
        if (cookieDomain) {
            response.cookies.set('super_admin_session', '', { ...baseCookie, domain: cookieDomain, expires: new Date(0) })
        }

        response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"')

        return response
    } catch (error: any) {
        console.error('Logout Error:', error)
        return NextResponse.json({ error: 'Failed to log out' }, { status: 500 })
    }
}

