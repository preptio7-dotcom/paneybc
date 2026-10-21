// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    joinUsRequest: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email', () => ({
  sendInstitutionalInquiryAlert: vi.fn().mockResolvedValue({ messageId: 'm1' }),
  sendInstitutionalAcknowledgementEmail: vi.fn().mockResolvedValue({ messageId: 'm2' }),
}))

import { prisma } from '@/lib/prisma'
import {
  sendInstitutionalInquiryAlert,
  sendInstitutionalAcknowledgementEmail,
} from '@/lib/email'
import { POST } from '@/app/api/public/institutions/contact/route'

describe('POST /api/public/institutions/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost/api/public/institutions/contact', {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher@college.edu' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Name is required')
    expect(prisma.joinUsRequest.create).not.toHaveBeenCalled()
  })

  it('returns 400 when email is invalid', async () => {
    const request = new NextRequest('http://localhost/api/public/institutions/contact', {
      method: 'POST',
      body: JSON.stringify({ name: 'Prof. Ahmad', email: 'invalid-email' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('valid email is required')
    expect(prisma.joinUsRequest.create).not.toHaveBeenCalled()
  })

  it('persists inquiry and dispatches both alert and acknowledgement emails', async () => {
    vi.mocked(prisma.joinUsRequest.create).mockResolvedValue({
      id: 'req_123',
      type: 'institutional_inquiry',
      name: 'Prof. Ahmad',
      email: 'ahmad@college.edu.pk',
      phone: '+92 300 1234567',
      institute: 'Lahore Commerce College',
      role: 'Dean / Department Head',
      experience: 'Students: 50-100 | Levels: PRC & CAF',
      message: 'Looking to enroll 80 students for the upcoming PRC attempt.',
      status: 'new',
      adminReply: null,
      repliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const request = new NextRequest('http://localhost/api/public/institutions/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Prof. Ahmad',
        email: 'ahmad@college.edu.pk',
        phone: '+92 300 1234567',
        institute: 'Lahore Commerce College',
        role: 'Dean / Department Head',
        studentCount: '50-100',
        subjects: 'PRC & CAF',
        message: 'Looking to enroll 80 students for the upcoming PRC attempt.',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.id).toBe('req_123')
    expect(prisma.joinUsRequest.create).toHaveBeenCalledTimes(1)
    expect(sendInstitutionalInquiryAlert).toHaveBeenCalledTimes(1)
    expect(sendInstitutionalAcknowledgementEmail).toHaveBeenCalledTimes(1)
    expect(sendInstitutionalInquiryAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Prof. Ahmad',
        email: 'ahmad@college.edu.pk',
        institute: 'Lahore Commerce College',
        studentCount: '50-100',
      })
    )
    expect(sendInstitutionalAcknowledgementEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Prof. Ahmad',
        email: 'ahmad@college.edu.pk',
      })
    )
  })
})
