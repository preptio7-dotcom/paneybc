// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/public/settings/route'

describe('GET /api/public/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.systemSettings.findFirst).mockResolvedValue({
      id: 's1',
      adsEnabled: true,
      welcomeMessageTemplate: 'Welcome',
      adContent: {},
      testSettings: {
        betaFeatures: { faq: 'beta_ambassador' },
        faq: {
          items: [{ question: 'Q1', answer: 'A1' }],
        },
      },
    } as any)
  })

  it('hides beta FAQ items for non-ambassador users', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(null)

    const request = new NextRequest('http://localhost/api/public/settings')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.testSettings.faq.items).toEqual([])
    expect(response.headers.get('Cache-Control')).toContain('public')
  })

  it('shows beta FAQ items for ambassadors', async () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      userId: 'u1',
      email: 'amb@test.com',
      role: 'student',
      iat: 0,
      exp: 0,
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      studentRole: 'ambassador',
    } as any)

    const request = new NextRequest('http://localhost/api/public/settings')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.testSettings.faq.items).toHaveLength(1)
    expect(body.testSettings.faq.visibility).toBe('beta_ambassador')
    expect(response.headers.get('Cache-Control')).toContain('private')
  })
})

