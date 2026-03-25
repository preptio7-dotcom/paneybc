export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendContactAdminEmail, sendContactConfirmationEmail } from '@/lib/email'
import { hasValidSameOrigin } from '@/lib/csrf'
import { detectSuspiciousInput, sanitizeEmail, sanitizeMultilineText, sanitizePlainText } from '@/lib/security-input'
import { enforceIpRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit'
import { getIpAccess, getRequestIpAddress, logSecurityEvent } from '@/lib/ip-security'

const CONTACT_ENDPOINT = '/api/contact'

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getRequestIpAddress(req)
    const ipAccess = await getIpAccess(ipAddress)

    if (!hasValidSameOrigin(req)) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'csrf_violation',
        status: 'active_threat',
        targetEndpoint: CONTACT_ENDPOINT,
      })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    if (!ipAccess.isWhitelisted) {
      const rateLimit = await enforceIpRateLimit(req, {
        scope: 'contact-submit',
        maxRequests: 8,
        windowSeconds: 600,
      })
      if (!rateLimit.allowed) {
        await logSecurityEvent({
          ipAddress,
          activityType: 'too_many_requests',
          status: 'active_threat',
          targetEndpoint: CONTACT_ENDPOINT,
          attemptsIncrement: rateLimit.currentCount,
        })
        return rateLimitExceededResponse('contact submissions', rateLimit.retryAfterSeconds)
      }
    }

    const body = await req.json()
    const suspiciousInput = detectSuspiciousInput(body || {})
    if (suspiciousInput) {
      await logSecurityEvent({
        ipAddress,
        activityType: 'xss_attempt',
        status: 'active_threat',
        targetEndpoint: `${CONTACT_ENDPOINT}#${suspiciousInput.field}`,
      })
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    const name = sanitizePlainText(body?.name, 120)
    const email = sanitizeEmail(body?.email)
    const subject = sanitizePlainText(body?.subject, 160)
    const message = sanitizeMultilineText(body?.message, 2500)

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    })

    try {
      await sendContactAdminEmail({ name, email, subject, message })
      await sendContactConfirmationEmail({ name, email, subject, message })
    } catch (emailError) {
      console.error('Contact email error:', emailError)
      return NextResponse.json({ error: 'Message saved but failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Contact API error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
