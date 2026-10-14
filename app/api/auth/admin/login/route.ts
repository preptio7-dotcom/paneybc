export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { sendAdminOTPEmail, sendSecurityAlertEmail } from '@/lib/email'
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
  getIpLoginLockRemainingSeconds,
  getAccountLockRemainingSeconds,
  registerFailedLoginAttempt,
  clearLoginFailureState,
  shouldSendAccountSecurityAlert,
} from '@/lib/login-security'

const ADMIN_LOGIN_ENDPOINT = '/api/auth/admin/login'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: ADMIN_LOGIN_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'auth-admin-login',
        maxRequests: 25,
        windowSeconds: 60,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: ADMIN_LOGIN_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('admin login', rateLimit.retryAfterSeconds)
      }

      const ipLockRemaining = await getIpLoginLockRemainingSeconds(ipAddress)
      if (ipLockRemaining > 0) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'brute_force_attempt',
          status: 'active_threat',
          targetEndpoint: ADMIN_LOGIN_ENDPOINT,
        })
        return NextResponse.json(
          { error: 'Too many attempts. Please try again in 15 minutes.' },
          { status: 429 }
        )
      }
    }

    const { email, password } = await request.json()
    const suspiciousInput = detectSuspiciousInput({ email, password })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${ADMIN_LOGIN_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = sanitizeEmail(email)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, avatar: true, role: true, password: true, isBanned: true, adminOtpFailedAttempts: true },
    })

    if (user && !ipAccess.isWhitelisted) {
      const accountLockRemaining = await getAccountLockRemainingSeconds(user.id)
      if (accountLockRemaining > 0) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'account_lockout',
          status: 'blocked',
          targetEndpoint: ADMIN_LOGIN_ENDPOINT,
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

    if (!user || user.role !== 'admin') {
      if (!ipAccess.isWhitelisted) {
        const failed = await registerFailedLoginAttempt({ ipAddress })
        await logSecurityEvent({
          ipAddress,
          activityType: 'failed_login',
          status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
          targetEndpoint: ADMIN_LOGIN_ENDPOINT,
        })

        if (failed.ipLockTriggered) {
          await logSecurityEvent({
            ipAddress,
            activityType: 'brute_force_attempt',
            status: 'active_threat',
            targetEndpoint: ADMIN_LOGIN_ENDPOINT,
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
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)
    if (!isPasswordValid) {
      if (!ipAccess.isWhitelisted) {
        const failed = await registerFailedLoginAttempt({ ipAddress, userId: user.id })

        await logSecurityEvent({
          ipAddress,
          activityType: 'failed_login',
          status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
          targetEndpoint: ADMIN_LOGIN_ENDPOINT,
          targetUserId: user.id,
        })

        if (failed.ipLockTriggered) {
          await logSecurityEvent({
            ipAddress,
            activityType: 'brute_force_attempt',
            status: 'active_threat',
            targetEndpoint: ADMIN_LOGIN_ENDPOINT,
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
            targetEndpoint: ADMIN_LOGIN_ENDPOINT,
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
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!ipAccess.isWhitelisted) {
      await clearLoginFailureState({ ipAddress, userId: user.id })
    }

    if (user.adminOtpFailedAttempts && user.adminOtpFailedAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { adminOtpFailedAttempts: 0 },
      })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'admin_login' } })
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        code,
        purpose: 'admin_login',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    try {
      await sendAdminOTPEmail(normalizedEmail, code)
    } catch (emailError: any) {
      console.error('[EMAIL] Admin OTP delivery failed:', emailError)
      return NextResponse.json({
        error: 'Credentials verified, but failed to send email. Check SMTP settings in .env',
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' }, { status: 200 })
  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
