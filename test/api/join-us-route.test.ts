// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    joinUsRequest: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email', () => ({
  sendJoinUsAdminEmail: vi.fn(),
  sendJoinUsThankYouEmail: vi.fn(),
}))

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/join-us/route'

describe('POST /api/join-us', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(null)

    const request = new NextRequest('http://localhost/api/join-us', {
      method: 'POST',
      body: JSON.stringify({ type: 'reviews', name: 'A', email: 'a@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(prisma.joinUsRequest.create).not.toHaveBeenCalled()
  })

  it('creates request when authenticated', async () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      userId: 'u1',
      email: 'admin@test.com',
      role: 'student',
      iat: 0,
      exp: 0,
    })

    const request = new NextRequest('http://localhost/api/join-us', {
      method: 'POST',
      body: JSON.stringify({ type: 'reviews', name: 'A', email: 'a@test.com' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.joinUsRequest.create).toHaveBeenCalledTimes(1)
  })
})

