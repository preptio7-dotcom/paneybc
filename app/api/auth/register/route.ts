export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { extractRegistrationSettings, normalizeEmail, normalizePkPhone, sanitizeText } from '@/lib/account-utils'
import { isPakistanRequest, blockedCountryResponse } from '@/lib/geo'
import { extractGeoRestrictionSettings } from '@/lib/geo-restriction'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'
const SESSION_JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const settings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
    const geoRestriction = extractGeoRestrictionSettings(settings?.testSettings || {})
    const geo = isPakistanRequest(request, { pakistanOnly: geoRestriction.pakistanOnly })
    if (!geo.allowed) {
      return blockedCountryResponse(geo.country)
    }

    const rateLimit = await enforceIpRateLimit(request, {
      scope: 'auth-register',
      maxRequests: 5,
      windowSeconds: 600,
    })
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse('signup attempts', rateLimit.retryAfterSeconds)
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
      acceptedTerms,
      verificationToken,
      website,
      startedAt,
    } = await request.json()

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

    if (!normalizedDegree || !normalizedLevel || !normalizedInstitute || !normalizedCity || !normalizedStudentId || !normalizedPhone) {
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

    const registrationSettings = extractRegistrationSettings(settings?.testSettings || {})
    if (!registrationSettings.degrees.includes(normalizedDegree)) {
      return NextResponse.json({ error: 'Selected degree is no longer available' }, { status: 400 })
    }
    if (!registrationSettings.levels.includes(normalizedLevel)) {
      return NextResponse.json({ error: 'Selected level is no longer available' }, { status: 400 })
    }

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

    const user = await prisma.user.create({
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
      select: { id: true, email: true, name: true, avatar: true, role: true, studentRole: true },
    })

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || '/avatars/boy_1.png',
          role: user.role,
          studentRole: user.studentRole,
        },
      },
      { status: 201 }
    )

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, SESSION_JWT_SECRET, {
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

