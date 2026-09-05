// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/community-markdown', () => ({
  enforceCommunityCooldown: vi.fn(() => true),
  renderCommunityMarkdown: vi.fn((s: string) => s),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    communityThread: {
      findFirst: vi.fn(),
    },
    communityComment: {
      findFirst: vi.fn(),
    },
    communityReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCommunityCooldown } from '@/lib/community-markdown'
import { POST, GET } from '@/app/api/community/report/route'

describe('/api/community/report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(enforceCommunityCooldown).mockReturnValue(true)
  })

  describe('POST', () => {
    it('returns 401 when unauthorized', async () => {
      vi.mocked(getCurrentUser).mockReturnValue(null)

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'thread', targetId: 't1', reason: 'Spam' }),
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 429 when on cooldown', async () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        userId: 'u1',
        email: 'u1@test.com',
        role: 'student',
        iat: 0,
        exp: 0,
      })
      vi.mocked(enforceCommunityCooldown).mockReturnValue(false)

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'thread', targetId: 't1', reason: 'Spam' }),
      })

      const res = await POST(req)
      expect(res.status).toBe(429)
    })

    it('returns 400 when input is missing', async () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        userId: 'u1',
        email: 'u1@test.com',
        role: 'student',
        iat: 0,
        exp: 0,
      })

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'invalid', targetId: '', reason: '' }),
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 404 when thread target does not exist', async () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        userId: 'u1',
        email: 'u1@test.com',
        role: 'student',
        iat: 0,
        exp: 0,
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', isBanned: false } as any)
      vi.mocked(prisma.communityThread.findFirst).mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'thread', targetId: 't1', reason: 'Spam thread' }),
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
    })

    it('successfully creates report for a thread', async () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        userId: 'u1',
        email: 'u1@test.com',
        role: 'student',
        iat: 0,
        exp: 0,
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', isBanned: false } as any)
      vi.mocked(prisma.communityThread.findFirst).mockResolvedValue({ id: 't1' } as any)
      vi.mocked(prisma.communityReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.communityReport.create).mockResolvedValue({
        id: 'rep1',
        targetType: 'thread',
        targetId: 't1',
        reporterId: 'u1',
        reason: 'Inappropriate content',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'thread', targetId: 't1', reason: 'Inappropriate content' }),
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.report.id).toBe('rep1')
      expect(prisma.communityReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'u1',
          targetType: 'thread',
          targetId: 't1',
          reason: 'Inappropriate content',
          status: 'open',
        },
      })
    })

    it('returns existing report if duplicate open report is submitted', async () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        userId: 'u1',
        email: 'u1@test.com',
        role: 'student',
        iat: 0,
        exp: 0,
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', isBanned: false } as any)
      vi.mocked(prisma.communityComment.findFirst).mockResolvedValue({ id: 'c1' } as any)
      vi.mocked(prisma.communityReport.findFirst).mockResolvedValue({
        id: 'existing1',
        targetType: 'comment',
        targetId: 'c1',
        reporterId: 'u1',
        reason: 'Duplicate report',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'comment', targetId: 'c1', reason: 'Duplicate report' }),
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Report already submitted')
      expect(prisma.communityReport.create).not.toHaveBeenCalled()
    })
  })

  describe('GET', () => {
    it('returns user reports when authenticated', async () => {
      vi.mocked(getCurrentUser).mockReturnValue({
        userId: 'u1',
        email: 'u1@test.com',
        role: 'student',
        iat: 0,
        exp: 0,
      })
      vi.mocked(prisma.communityReport.findMany).mockResolvedValue([
        { id: 'rep1', reason: 'Spam', targetType: 'thread', targetId: 't1' },
      ] as any)

      const req = new NextRequest('http://localhost/api/community/report', {
        method: 'GET',
      })

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.reports).toHaveLength(1)
      expect(data.reports[0].id).toBe('rep1')
    })
  })
})
