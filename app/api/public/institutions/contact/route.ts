export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  sendInstitutionalInquiryAlert,
  sendInstitutionalAcknowledgementEmail,
} from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      email,
      phone,
      institute,
      role,
      studentCount,
      subjects,
      message,
    } = body || {}

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : null
    const trimmedInstitute = typeof institute === 'string' ? institute.trim() : null
    const trimmedRole = typeof role === 'string' ? role.trim() : 'Educator'
    const trimmedStudentCount = typeof studentCount === 'string' || typeof studentCount === 'number'
      ? String(studentCount).trim()
      : '15+'
    const trimmedSubjects = typeof subjects === 'string' ? subjects.trim() : 'PRC / CAF / CFAP'
    const trimmedMessage = typeof message === 'string' ? message.trim() : ''

    // 1. Store in database
    const savedRequest = await prisma.joinUsRequest.create({
      data: {
        type: 'institutional_inquiry',
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        institute: trimmedInstitute || 'Not specified',
        role: trimmedRole,
        experience: `Students: ${trimmedStudentCount} | Levels: ${trimmedSubjects}`,
        message: trimmedMessage || 'Interested in institutional bulk student enrollment.',
        status: 'new',
      },
    })

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      institute: trimmedInstitute,
      role: trimmedRole,
      studentCount: trimmedStudentCount,
      subjects: trimmedSubjects,
      message: trimmedMessage,
    }

    // 2. Dispatch email to support@preptio.com & acknowledgement to applicant in parallel
    const emailResults = await Promise.allSettled([
      sendInstitutionalInquiryAlert(payload),
      sendInstitutionalAcknowledgementEmail(payload),
    ])

    emailResults.forEach((res, idx) => {
      if (res.status === 'rejected') {
        console.error(
          idx === 0
            ? '[institutional-contact] Failed to send support alert email:'
            : '[institutional-contact] Failed to send applicant acknowledgement email:',
          res.reason
        )
      }
    })

    return NextResponse.json({
      success: true,
      id: savedRequest.id,
      message: 'Inquiry received. An acknowledgement email has been sent to your address.',
    })
  } catch (error: any) {
    console.error('[institutional-contact] Error processing inquiry:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to submit institutional inquiry.' },
      { status: 500 }
    )
  }
}
