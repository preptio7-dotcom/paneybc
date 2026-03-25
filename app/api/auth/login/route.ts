export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
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
  clearLoginFailureState,
  getAccountLockRemainingSeconds,
  getIpLoginLockRemainingSeconds,
  registerFailedLoginAttempt,
  shouldSendAccountSecurityAlert,
} from '@/lib/login-security'
import { sendSecurityAlertEmail } from '@/lib/email'
import { resolveAvatarForUser } from '@/lib/avatar-pack-service'

const LOGIN_ENDPOINT = '/api/auth/login'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: LOGIN_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const genericRateLimit = await enforceIpRateLimit(request, {
        scope: 'auth-login',
        maxRequests: 25,
        windowSeconds: 60,
      })
      if (!genericRateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: LOGIN_ENDPOINT,
          attemptsIncrement: genericRateLimit.currentCount,
        })
        return rateLimitExceededResponse('login', genericRateLimit.retryAfterSeconds)
      }

      const ipLockRemaining = await getIpLoginLockRemainingSeconds(ipAddress)
      if (ipLockRemaining > 0) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'brute_force_attempt',
          status: 'active_threat',
          targetEndpoint: LOGIN_ENDPOINT,
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
        targetEndpoint: `${LOGIN_ENDPOINT}#${suspiciousInput.field}`,
        attemptedEmail: typeof email === 'string' ? email.toLowerCase().trim() : null,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = sanitizeEmail(email)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        avatarId: true,
        role: true,
        studentRole: true,
        popupDismissed: true,
        referralCode: true,
        referralLink: true,
        password: true,
        isBanned: true,
      },
    })

    if (user && !ipAccess.isWhitelisted) {
      const accountLockRemaining = await getAccountLockRemainingSeconds(user.id)
      if (accountLockRemaining > 0) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'account_lockout',
          status: 'blocked',
          targetEndpoint: LOGIN_ENDPOINT,
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

    if (!user) {
      if (!ipAccess.isWhitelisted) {
        const failed = await registerFailedLoginAttempt({ ipAddress })
        await logSecurityEvent({
          ipAddress,
          activityType: 'failed_login',
          status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
          targetEndpoint: LOGIN_ENDPOINT,
          attemptedEmail: normalizedEmail,
        })

        if (failed.ipLockTriggered) {
          await logSecurityEvent({
            ipAddress,
            activityType: 'brute_force_attempt',
            status: 'active_threat',
            targetEndpoint: LOGIN_ENDPOINT,
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

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      return NextResponse.json({ error: 'No email found' }, { status: 401 })
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)
    if (!isPasswordValid) {
      if (!ipAccess.isWhitelisted) {
        const failed = await registerFailedLoginAttempt({ ipAddress, userId: user.id })

        await logSecurityEvent({
          ipAddress,
          activityType: 'failed_login',
          status: failed.ipLockTriggered ? 'active_threat' : 'suspicious',
          targetEndpoint: LOGIN_ENDPOINT,
          targetUserId: user.id,
          attemptedEmail: normalizedEmail,
        })

        if (failed.ipLockTriggered) {
          await logSecurityEvent({
            ipAddress,
            activityType: 'brute_force_attempt',
            status: 'active_threat',
            targetEndpoint: LOGIN_ENDPOINT,
            targetUserId: user.id,
          })

          await maybeAutoBlockIp({
            ipAddress,
            reason: 'Auto-blocked after repeated brute force attempts',
            totalAttemptsBeforeBlock: failed.ipAttempts,
          })
        }

        if (failed.accountLockTriggered) {
          await logSecurityEvent({
            ipAddress,
            activityType: 'account_lockout',
            status: 'blocked',
            targetEndpoint: LOGIN_ENDPOINT,
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

        if (failed.ipLockTriggered) {
          return NextResponse.json(
            { error: 'Too many attempts. Please try again in 15 minutes.' },
            { status: 429 }
          )
        }
      }

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!ipAccess.isWhitelisted) {
      await clearLoginFailureState({ ipAddress, userId: user.id })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '7d',
      }
    )

    const resolvedAvatar = await resolveAvatarForUser(user)

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarId: resolvedAvatar.avatarId,
          avatar: resolvedAvatar.avatar,
          role: user.role,
          studentRole: user.studentRole,
          popupDismissed: user.popupDismissed,
          referralCode: user.referralCode,
          referralLink: user.referralLink,
        },
      },
      { status: 200 }
    )

    const cookieDomain = process.env.COOKIE_DOMAIN
    const isProd = process.env.NODE_ENV === 'production'
    const host = request.nextUrl.hostname
    const normalizedCookieDomain = cookieDomain?.replace(/^\./, '')
    const shouldSetDomain = Boolean(
      isProd && normalizedCookieDomain && host && host.endsWith(normalizedCookieDomain)
    )
    response.cookies.set('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      ...(shouldSetDomain ? { domain: `.${normalizedCookieDomain}` } : {}),
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
