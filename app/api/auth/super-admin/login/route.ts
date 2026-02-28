import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendOTPEmail, sendSecurityAlertEmail } from '@/lib/email'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import {
  getIpAccess,
  getRequestIpAddress,
  logSecurityEvent,
  maybeAutoBlockIp,
} from '@/lib/ip-security'
import {
  getAccountLockRemainingSeconds,
  getIpLoginLockRemainingSeconds,
  registerFailedLoginAttempt,
  clearLoginFailureState,
  shouldSendAccountSecurityAlert,
} from '@/lib/login-security'

export const runtime = 'nodejs'
const SUPER_ADMIN_LOGIN_ENDPOINT = '/api/auth/super-admin/login'

export async function POST(req: NextRequest) {
    try {
        const ipAddress = getRequestIpAddress(req)
        const ipAccess = await getIpAccess(ipAddress)

        if (!hasValidSameOrigin(req)) {
            await logSecurityEvent({
                ipAddress,
                activityType: 'csrf_violation',
                status: 'active_threat',
                targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
            })
            return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
        }

        if (!ipAccess.isWhitelisted) {
            const rateLimit = await enforceIpRateLimit(req, {
                scope: 'auth-super-admin-login',
                maxRequests: 20,
                windowSeconds: 600,
            })
            if (!rateLimit.allowed) {
                await logSecurityEvent({
                    ipAddress,
                    activityType: 'too_many_requests',
                    status: 'active_threat',
                    targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                    attemptsIncrement: rateLimit.currentCount,
                })
                return rateLimitExceededResponse('super admin login', rateLimit.retryAfterSeconds)
            }

            const ipLockRemaining = await getIpLoginLockRemainingSeconds(ipAddress)
            if (ipLockRemaining > 0) {
                await logSecurityEvent({
                    ipAddress,
                    activityType: 'brute_force_attempt',
                    status: 'active_threat',
                    targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                })
                return NextResponse.json(
                    { error: 'Too many attempts. Please try again in 15 minutes.' },
                    { status: 429 }
                )
            }
        }

        const body = await req.json()
        const suspiciousInput = detectSuspiciousInput({
            email: body?.email,
            password: body?.password,
        })
        if (suspiciousInput) {
            await logSecurityEvent({
                ipAddress,
                activityType: 'xss_attempt',
                status: 'active_threat',
                targetEndpoint: `${SUPER_ADMIN_LOGIN_ENDPOINT}#${suspiciousInput.field}`,
            })
            return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
        }

        // Trim and lowercase email to avoid input issues
        const email = sanitizeEmail(body.email)
        const password = body.password?.trim()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
        if (superAdminEmail && email !== superAdminEmail) {
            return NextResponse.json({ error: 'Use the super admin email address to login.' }, { status: 401 })
        }

        const targetEmail = superAdminEmail || email

        console.log(`[AUTH] Login attempt for: ${targetEmail}`)

        // 1. Find user (explicitly selecting password)
        const user = await prisma.user.findUnique({
            where: { email: targetEmail },
            select: { id: true, email: true, name: true, role: true, password: true, isBanned: true },
        })

        if (!user) {
            if (!ipAccess.isWhitelisted) {
                const failed = await registerFailedLoginAttempt({ ipAddress })
                await logSecurityEvent({
                    ipAddress,
                    activityType: 'failed_login',
                    status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
                    targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                })

                if (failed.ipLockTriggered) {
                    await logSecurityEvent({
                        ipAddress,
                        activityType: 'brute_force_attempt',
                        status: 'active_threat',
                        targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                    })
                    await maybeAutoBlockIp({
                        ipAddress,
                        reason: 'Auto-blocked after repeated brute force attempts',
                        totalAttemptsBeforeBlock: failed.ipAttempts,
                    })
                    return NextResponse.json(
                        { error: 'Too many attempts. Please try again in 15 minutes.' },
                        { status: 429 }
                    )
                }
            }
            console.log(`[AUTH] User not found: ${targetEmail}`)
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        if (!ipAccess.isWhitelisted) {
            const accountLockRemaining = await getAccountLockRemainingSeconds(user.id)
            if (accountLockRemaining > 0) {
                await logSecurityEvent({
                    ipAddress,
                    activityType: 'account_lockout',
                    status: 'blocked',
                    targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                    targetUserId: user.id,
                })
                return NextResponse.json(
                    {
                        error:
                            'Your account is temporarily locked due to multiple failed login attempts. Please reset your password or try again later.',
                    },
                    { status: 423 }
                )
            }
        }

        if (user.role !== 'super_admin') {
            if (!ipAccess.isWhitelisted) {
                const failed = await registerFailedLoginAttempt({ ipAddress, userId: user.id })
                await logSecurityEvent({
                    ipAddress,
                    activityType: 'failed_login',
                    status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
                    targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                    targetUserId: user.id,
                })
            }
            console.log(`[AUTH] User exists but is not super_admin: ${email} (${user.role})`)
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
        }

        if (user.isBanned) {
            return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
        }

        // 2. Verify password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            if (!ipAccess.isWhitelisted) {
                const failed = await registerFailedLoginAttempt({ ipAddress, userId: user.id })

                await logSecurityEvent({
                    ipAddress,
                    activityType: 'failed_login',
                    status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
                    targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                    targetUserId: user.id,
                })

                if (failed.ipLockTriggered) {
                    await logSecurityEvent({
                        ipAddress,
                        activityType: 'brute_force_attempt',
                        status: 'active_threat',
                        targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                        targetUserId: user.id,
                    })
                    await maybeAutoBlockIp({
                        ipAddress,
                        reason: 'Auto-blocked after repeated brute force attempts',
                        totalAttemptsBeforeBlock: failed.ipAttempts,
                    })
                    return NextResponse.json(
                        { error: 'Too many attempts. Please try again in 15 minutes.' },
                        { status: 429 }
                    )
                }

                if (failed.accountLockTriggered) {
                    await logSecurityEvent({
                        ipAddress,
                        activityType: 'account_lockout',
                        status: 'blocked',
                        targetEndpoint: SUPER_ADMIN_LOGIN_ENDPOINT,
                        targetUserId: user.id,
                        attemptsIncrement: failed.accountAttempts,
                    })
                    const shouldEmail = await shouldSendAccountSecurityAlert(user.id)
                    if (shouldEmail) {
                        try {
                            await sendSecurityAlertEmail(user.email, user.name)
                        } catch (emailError) {
                            console.error('Security alert email send failed:', emailError)
                        }
                    }
                }
            }
            console.log(`[AUTH] Password mismatch for: ${email}`)
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        if (!ipAccess.isWhitelisted) {
            await clearLoginFailureState({ ipAddress, userId: user.id })
        }

        // 3. Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        // 4. Save OTP (expires in 10 minutes)
        await prisma.otp.deleteMany({ where: { email: targetEmail } })
        await prisma.otp.create({
            data: {
                email: targetEmail,
                code,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        })

        // 5. Send OTP via Email
        try {
            console.log(`[EMAIL] Attempting to send OTP to: ${targetEmail}`)
            await sendOTPEmail(targetEmail, code)
            console.log(`[EMAIL] OTP sent successfully to: ${targetEmail}`)
        } catch (emailError: any) {
            console.error('[EMAIL] Delivery Failed:', emailError)
            return NextResponse.json({
                error: 'Credentials verified, but failed to send email. Check SMTP settings in .env'
            }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' })
    } catch (error: any) {
        console.error('[AUTH] Super Admin Login Error:', error)
        return NextResponse.json({ error: 'Server error during login' }, { status: 500 })
    }
}

