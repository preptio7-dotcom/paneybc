// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/admin-audit', () => ({
  createAdminAuditLog: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/admin/system/settings/route'

describe('POST /api/admin/system/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for non-admin user role', async () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      userId: 'u1',
      email: 'student@test.com',
      role: 'student',
      iat: 0,
      exp: 0,
    })

    const request = new NextRequest('http://localhost/api/admin/system/settings', {
      method: 'POST',
      body: JSON.stringify({ testSettings: { betaFeatures: { faq: 'public' } } }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('normalizes and saves beta settings for admin', async () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      userId: 'admin-1',
      email: 'admin@test.com',
      role: 'admin',
      iat: 0,
      exp: 0,
    })

    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue({
      id: 's1',
      adsEnabled: false,
      welcomeMessageTemplate: 'Welcome',
      adContent: {},
      testSettings: {},
    } as any)

    vi.mocked(prisma.systemSettings.update).mockImplementation(async ({ data }: any) => ({
      id: 's1',
      adsEnabled: false,
      welcomeMessageTemplate: 'Welcome',
      adContent: data.adContent,
      testSettings: data.testSettings,
    }))

    const request = new NextRequest('http://localhost/api/admin/system/settings', {
      method: 'POST',
      body: JSON.stringify({ testSettings: { betaFeatures: { faq: 'public' } } }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.testSettings.betaFeatures.faq).toBe('public')
    expect(body.testSettings.faq.visibility).toBe('public')
    expect(prisma.systemSettings.update).toHaveBeenCalledTimes(1)
  })
})
