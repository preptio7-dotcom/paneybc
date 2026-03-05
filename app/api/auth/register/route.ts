export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { BlogAnalyticsEventType, BlogReferrerSource } from '@prisma/client'
import { extractRegistrationSettings, normalizeEmail, normalizePkPhone, sanitizeText } from '@/lib/account-utils'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'
import { getDeterministicSeedFromPool, packAvatarId } from '@/lib/avatar'
import { getActiveAvatarPack, resolveAvatarForUser } from '@/lib/avatar-pack-service'
import { detectReferrerSource } from '@/lib/blog-analytics'
import { sendInstituteSuggestionAdminEmail } from '@/lib/email'
import { getInstituteKey } from '@/lib/institutes'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'
const SESSION_JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const REGISTER_ENDPOINT = '/api/auth/register'

type BlogReferralPayload = {
  post_id?: unknown
  post_slug?: unknown
  visited_at?: unknown
  session_id?: unknown
}

function parseBlogReferral(raw: unknown): {
  postId: string
  postSlug: string
  visitedAt: number
  sessionId: string
} | null {
  if (!raw || typeof raw !== 'object') return null
  const payload = raw as BlogReferralPayload
  const postId = String(payload.post_id || '').trim()
  const postSlug = String(payload.post_slug || '').trim()
  const visitedAt = Number(payload.visited_at || 0)
  const sessionId = String(payload.session_id || '').trim()
  if (!postId || !postSlug || !Number.isFinite(visitedAt) || !sessionId) return null
  if (visitedAt <= 0) return null
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  if (Date.now() - visitedAt > sevenDaysMs) return null
  return { postId, postSlug, visitedAt, sessionId }
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(request)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(request)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: REGISTER_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(request, {
        scope: 'auth-register',
        maxRequests: 5,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: REGISTER_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('signup attempts', rateLimit.retryAfterSeconds)
      }
    }

    const {
      email,
      password,
      name,
      degree,
      level,
      institute,
      city,
      studentId,
      phone,
      instituteRating,
      instituteSelectionMode,
      acceptedTerms,
      verificationToken,
      website,
      startedAt,
      blogReferral,
    } = await request.json()

    const suspiciousInput = detectSuspiciousInput({
      email,
      name,
      degree,
      level,
      institute,
      city,
      studentId,
      phone,
      website,
    })
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${REGISTER_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(email || '')
    const normalizedName = sanitizeText(name || '', 100)
    const normalizedDegree = sanitizeText(degree || '', 40)
    const normalizedLevel = sanitizeText(level || '', 40)
    const normalizedInstitute = sanitizeText(institute || '', 120)
    const normalizedCity = sanitizeText(city || '', 80)
    const normalizedStudentId = sanitizeText(studentId || '', 60)
    const normalizedPhone = normalizePkPhone(phone || '')
    const parsedRating = Number(instituteRating)

    if (typeof website === 'string' && website.trim().length > 0) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${REGISTER_ENDPOINT}#website`,
      })
      return NextResponse.json({ error: 'Spam detected' }, { status: 400 })
    }

    if (typeof startedAt !== 'number' || Date.now() - startedAt < 2500) {
      return NextResponse.json({ error: 'Please retry signup and submit again' }, { status: 429 })
    }

    if (!normalizedEmail || !password || !normalizedName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (
      !normalizedDegree ||
      !normalizedLevel ||
      !normalizedInstitute ||
      !normalizedCity ||
      !normalizedStudentId ||
      !normalizedPhone
    ) {
      return NextResponse.json({ error: 'Please complete all required profile fields' }, { status: 400 })
    }

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Institute rating must be between 1 and 5' }, { status: 400 })
    }

    if (!acceptedTerms) {
      return NextResponse.json({ error: 'You must accept the terms and conditions' }, { status: 400 })
    }

    if (!verificationToken) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 401 })
    }

    try {
      const payload = jwt.verify(verificationToken, JWT_SECRET) as { email: string; purpose?: string }
      if (normalizeEmail(payload.email) !== normalizedEmail || payload.purpose !== 'signup') {
        return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 401 })
    }

    const settings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
    const registrationSettings = extractRegistrationSettings(settings?.testSettings || {})
    if (!registrationSettings.degrees.includes(normalizedDegree)) {
      return NextResponse.json({ error: 'Selected degree is no longer available' }, { status: 400 })
    }
    if (!registrationSettings.levels.includes(normalizedLevel)) {
      return NextResponse.json({ error: 'Selected level is no longer available' }, { status: 400 })
    }
    const normalizedInstituteKey = normalizedInstitute.toLowerCase()
    const isKnownInstitute = registrationSettings.institutes.some(
      (item) => item.toLowerCase() === normalizedInstituteKey
    )
    const shouldNotifyInstituteSuggestion =
      String(instituteSelectionMode || '').toLowerCase() === 'other' || !isKnownInstitute

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const duplicateWhere: any[] = [{ email: normalizedEmail }]
    if (normalizedPhone) duplicateWhere.push({ phone: normalizedPhone })
    if (normalizedStudentId) duplicateWhere.push({ studentId: normalizedStudentId })
    const duplicateUser = await prisma.user.findFirst({ where: { OR: duplicateWhere } })
    if (duplicateUser) {
      if (duplicateUser.phone === normalizedPhone) {
        return NextResponse.json({ error: 'Phone number is already in use' }, { status: 409 })
      }
      if (duplicateUser.studentId === normalizedStudentId) {
        return NextResponse.json({ error: 'Student ID is already in use' }, { status: 409 })
      }
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const hashedPassword = await bcryptjs.hash(password, 10)

    const activePack = await getActiveAvatarPack()

    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: normalizedName,
        role: 'student',
        studentRole: 'unpaid',
        degree: normalizedDegree,
        level: normalizedLevel,
        institute: normalizedInstitute,
        city: normalizedCity,
        studentId: normalizedStudentId,
        phone: normalizedPhone,
        instituteRating: parsedRating,
        termsAcceptedAt: new Date(),
      },
      select: { id: true, email: true, name: true, avatar: true, avatarId: true, role: true, studentRole: true },
    })

    const deterministicSeed = getDeterministicSeedFromPool(createdUser.id, activePack.seeds)
    const avatarId = packAvatarId(activePack.id, deterministicSeed)
    const createdUserWithAvatar = await prisma.user.update({
      where: { id: createdUser.id },
      data: { avatarId },
      select: { id: true, email: true, name: true, avatar: true, avatarId: true, role: true, studentRole: true },
    })

    const resolvedAvatar = await resolveAvatarForUser(createdUserWithAvatar)

    if (shouldNotifyInstituteSuggestion) {
      const normalizedInstituteName = normalizedInstitute
      const normalizedInstituteSuggestionKey = getInstituteKey(normalizedInstituteName)
      let shouldSendInstituteSuggestionEmail = false

      if (normalizedInstituteSuggestionKey) {
        const existingSuggestion = await prisma.instituteSuggestion.findUnique({
          where: {
            normalizedName: normalizedInstituteSuggestionKey,
          },
          select: {
            id: true,
            status: true,
          },
        })

        if (existingSuggestion) {
          const shouldReopen = existingSuggestion.status === 'rejected'
          await prisma.instituteSuggestion.update({
            where: { id: existingSuggestion.id },
            data: {
              suggestedName: normalizedInstituteName,
              requestedByUserId: createdUserWithAvatar.id,
              requestedByEmail: normalizedEmail,
              requestedByName: normalizedName,
              usageCount: {
                increment: 1,
              },
              ...(shouldReopen
                ? {
                    status: 'pending',
                    reviewedAt: null,
                    reviewedBy: null,
                    reviewNote: null,
                  }
                : {}),
            },
          })
          shouldSendInstituteSuggestionEmail = shouldReopen
        } else {
          await prisma.instituteSuggestion.create({
            data: {
              suggestedName: normalizedInstituteName,
              normalizedName: normalizedInstituteSuggestionKey,
              status: 'pending',
              requestedByUserId: createdUserWithAvatar.id,
              requestedByEmail: normalizedEmail,
              requestedByName: normalizedName,
              usageCount: 1,
            },
          })
          shouldSendInstituteSuggestionEmail = true
        }
      }

      if (shouldSendInstituteSuggestionEmail) {
        try {
          await sendInstituteSuggestionAdminEmail({
            userName: normalizedName,
            userEmail: normalizedEmail,
            selectedInstitute: normalizedInstitute,
          })
        } catch {
          // Do not block registration if admin notification email fails.
        }
      }
    }

    const referral = parseBlogReferral(blogReferral)
    if (referral) {
      try {
        const referredPost = await prisma.blogPost.findFirst({
          where: {
            id: referral.postId,
            slug: referral.postSlug,
          },
          select: { id: true },
        })

        if (referredPost) {
          await prisma.blogAnalyticsEvent.create({
            data: {
              postId: referredPost.id,
              eventType: BlogAnalyticsEventType.signup_from_blog,
              userId: createdUserWithAvatar.id,
              sessionId: referral.sessionId.slice(0, 120),
              referrerSource: detectReferrerSource(request.headers.get('referer')) as BlogReferrerSource,
            },
          })
        }
      } catch {
        // Do not block registration on analytics attribution failures.
      }
    }

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: createdUserWithAvatar.id,
          email: createdUserWithAvatar.email,
          name: createdUserWithAvatar.name,
          avatarId: resolvedAvatar.avatarId,
          avatar: resolvedAvatar.avatar,
          role: createdUserWithAvatar.role,
          studentRole: createdUserWithAvatar.studentRole,
        },
      },
      { status: 201 }
    )

    const token = jwt.sign({ userId: createdUserWithAvatar.id, email: createdUserWithAvatar.email, role: createdUserWithAvatar.role }, SESSION_JWT_SECRET, {
      expiresIn: '7d',
    })

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
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}
