export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSignupVerificationEmail } from '@/lib/email'
import { isPakistanRequest, blockedCountryResponse } from '@/lib/geo'
import { extractGeoRestrictionSettings } from '@/lib/geo-restriction'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const systemSettings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
    const geoRestriction = extractGeoRestrictionSettings(systemSettings?.testSettings || {})
    const geo = isPakistanRequest(req, { pakistanOnly: geoRestriction.pakistanOnly })
    if (!geo.allowed) {
      return blockedCountryResponse(geo.country)
    }

    const rateLimit = await enforceIpRateLimit(req, {
      scope: 'auth-signup-send-code',
      maxRequests: 5,
      windowSeconds: 600,
    })
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse('signup code requests', rateLimit.retryAfterSeconds)
    }

    const { email } = await req.json()

    const normalizedEmail = email?.trim().toLowerCase()
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const latestOtp = await prisma.otp.findFirst({
      where: { email: normalizedEmail, purpose: 'signup' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (latestOtp && Date.now() - new Date(latestOtp.createdAt).getTime() < 45_000) {
      return NextResponse.json({ error: 'Please wait a few seconds before requesting a new code' }, { status: 429 })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await prisma.otp.deleteMany({ where: { email: normalizedEmail, purpose: 'signup' } })
    await prisma.otp.create({
      data: {
        email: normalizedEmail,
        code,
        purpose: 'signup',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    try {
      await sendSignupVerificationEmail(normalizedEmail, code)
    } catch (emailError: any) {
      console.error('[EMAIL] Signup verification send failed:', emailError)
      return NextResponse.json({ error: 'Failed to send verification email. Check SMTP settings.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' })
  } catch (error: any) {
    console.error('[AUTH] Signup send-code error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

