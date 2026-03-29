import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent, maybeAutoBlockIp } from '@/lib/ip-security'

export const runtime = 'nodejs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'
const SUPER_ADMIN_VERIFY_ENDPOINT = '/api/auth/super-admin/verify'

export async function POST(req: NextRequest) {
    try {
        const ipAddress = getRequestIpAddress(req)
        const ipAccess = await getIpAccess(ipAddress)

        if (!hasValidSameOrigin(req)) {
            await logSecurityEvent({
                ipAddress,
                activityType: 'csrf_violation',
                status: 'active_threat',
                targetEndpoint: SUPER_ADMIN_VERIFY_ENDPOINT,
            })
            return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
        }

        if (!ipAccess.isWhitelisted) {
            const rateLimit = await enforceIpRateLimit(req, {
                scope: 'auth-super-admin-verify',
                maxRequests: 20,
                windowSeconds: 600,
            })
            if (!rateLimit.allowed) {
                await logSecurityEvent({
                    ipAddress,
                    activityType: 'too_many_requests',
                    status: 'active_threat',
                    targetEndpoint: SUPER_ADMIN_VERIFY_ENDPOINT,
                    attemptsIncrement: rateLimit.currentCount,
                })
                return rateLimitExceededResponse('super admin otp verification', rateLimit.retryAfterSeconds)
            }
        }

        const { email, code } = await req.json()
        const suspiciousInput = detectSuspiciousInput({ email, code })
        if (suspiciousInput) {
            await logSecurityEvent({
                ipAddress,
                activityType: 'xss_attempt',
                status: 'active_threat',
                targetEndpoint: `${SUPER_ADMIN_VERIFY_ENDPOINT}#${suspiciousInput.field}`,
            })
            return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
        }

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
        }

        const normalizedEmail = sanitizeEmail(email)
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
        if (superAdminEmail && normalizedEmail !== superAdminEmail) {
            return NextResponse.json({ error: 'Use the super admin email address to verify.' }, { status: 401 })
        }

        const normalizedCode = sanitizePlainText(code, 16)

        // 1. Find OTP
        const otp = await prisma.otp.findFirst({
            where: {
                email: normalizedEmail,
                code: normalizedCode,
            },
            select: {
                id: true,
                expiresAt: true,
            }
        })
        
        if (!otp || otp.expiresAt.getTime() < Date.now()) {
            await logSecurityEvent({
                ipAddress,
                activityType: 'failed_login',
                status: 'suspicious',
                targetEndpoint: SUPER_ADMIN_VERIFY_ENDPOINT,
            })
            await logSecurityEvent({
                ipAddress,
                activityType: 'brute_force_attempt',
                status: 'active_threat',
                targetEndpoint: SUPER_ADMIN_VERIFY_ENDPOINT,
            })
            await maybeAutoBlockIp({
                ipAddress,
                reason: 'Auto-blocked after repeated brute force attempts',
            })
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
        }

        // 2. Clear OTP
        await prisma.otp.deleteMany({ where: { email: normalizedEmail } })

        // 3. Find User to get ID and confirm role
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
        if (!user || user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
        }

        // 4. Create JWT for Super Admin session
        const token = jwt.sign(
            { id: user.id, role: 'super_admin' },
            JWT_SECRET,
            { expiresIn: '1d' }
        )

        // 5. Set Cookie
        const cookieStore = await cookies()
        cookieStore.set('super_admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        })

        return NextResponse.json({ success: true, message: 'Verified successfully' })
    } catch (error: any) {
        console.error('OTP Verification Error:', error)
        return NextResponse.json({ error: 'Server error during verification' }, { status: 500 })
    }
}

