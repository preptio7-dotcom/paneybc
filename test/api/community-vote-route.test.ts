// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), participate: vi.fn(), limit: vi.fn(), thread: vi.fn(), comment: vi.fn(), upsert: vi.fn(), remove: vi.fn(), aggregate: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getCurrentUser: mocks.auth }))
vi.mock('@/lib/community-server', () => ({ canParticipate: mocks.participate, communityLimit: mocks.limit }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn({ communityThread: { findFirst: mocks.thread }, communityComment: { findFirst: mocks.comment }, communityVote: { upsert: mocks.upsert, deleteMany: mocks.remove, aggregate: mocks.aggregate } }) } }))
import { POST } from '@/app/api/community/vote/route'
const request = (value: unknown, targetType = 'thread') => new NextRequest('http://localhost/api/community/vote', { method: 'POST', body: JSON.stringify({ targetType, targetId: 't1', value }) })
describe('community votes', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockReturnValue({ userId: 'u1' }); mocks.participate.mockResolvedValue(true); mocks.limit.mockResolvedValue(null); mocks.thread.mockResolvedValue({ id: 't1' }); mocks.comment.mockResolvedValue({ id: 'c1' }); mocks.aggregate.mockResolvedValue({ _sum: { value: 2 } }) })
  it('requires authentication and rejects banned accounts', async () => {
    mocks.auth.mockReturnValue(null); expect((await POST(request(1))).status).toBe(401)
    mocks.auth.mockReturnValue({ userId: 'u1' }); mocks.participate.mockResolvedValue(false); expect((await POST(request(1))).status).toBe(403)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('supports removing a vote idempotently', async () => {
    const response = await POST(request(0))
    expect(await response.json()).toEqual({ score: 2, viewerVote: 0 })
    expect(mocks.remove).toHaveBeenCalledWith({ where: { userId: 'u1', targetType: 'thread', targetId: 't1' } })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('sets a vote instead of incrementing on retried requests', async () => {
    await POST(request(-1)); await POST(request(-1))
    expect(mocks.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ update: { value: -1 } }))
  })
  it('does not allow votes on comments belonging to removed discussions', async () => {
    mocks.comment.mockResolvedValue(null)
    expect((await POST(request(1, 'comment'))).status).toBe(404)
    expect(mocks.comment).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ thread: { deleted: false } }) }))
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it.each([2, null, '1'])('rejects malformed vote %s', async value => expect((await POST(request(value))).status).toBe(400))
})
