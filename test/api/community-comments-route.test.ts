// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ thread: vi.fn(), findMany: vi.fn(), parent: vi.fn(), create: vi.fn(), count: vi.fn(), groupBy: vi.fn(), votes: vi.fn(), auth: vi.fn(), participate: vi.fn(), limit: vi.fn(), query: vi.fn(), transaction: vi.fn(), notify: vi.fn() }))
vi.mock('@/lib/community-mutations', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/community-mutations')>(), notifyComment: m.notify }))
vi.mock('@/lib/auth', () => ({ getCurrentUser: m.auth }))
vi.mock('@/lib/community-server', () => ({ canParticipate: m.participate, communityLimit: m.limit }))
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: m.query, $transaction: m.transaction, communityThread: { findFirst: m.thread }, communityComment: { findMany: m.findMany, findFirst: m.parent, create: m.create, count: m.count }, communityVote: { groupBy: m.groupBy, findMany: m.votes } } }))
import { GET, POST } from '@/app/api/community/threads/[threadId]/comments/route'
const context = { params: Promise.resolve({ threadId: 't1' }) }
const req = (query = '') => new NextRequest(`http://localhost/api/community/threads/t1/comments${query}`)
const post = (body: string, parentCommentId: string | null = null) => new NextRequest('http://localhost/api/community/threads/t1/comments', { method: 'POST', body: JSON.stringify({ body, parentCommentId }) })
const comment = (id: string, parentCommentId: string | null = null, deleted = false) => ({ id, parentCommentId, deleted, body: 'Private removed text', createdAt: new Date(), author: { id: 'u1', name: 'Student', avatar: null } })
describe('community comments', () => {
  beforeEach(() => { vi.clearAllMocks(); m.query.mockResolvedValue([{ id: 'child' }, { id: '2' }, { id: '3' }]); m.transaction.mockImplementation(async fn => fn({ $queryRaw: m.query, communityThread: { findFirst: m.thread }, communityComment: { findFirst: m.parent, create: m.create } })); m.thread.mockResolvedValue({ id: 't1', locked: false }); m.auth.mockReturnValue({ userId: 'u1' }); m.participate.mockResolvedValue(true); m.limit.mockResolvedValue(null); m.count.mockResolvedValue(1); m.groupBy.mockResolvedValue([]); m.votes.mockResolvedValue([]); m.findMany.mockResolvedValue([]); m.create.mockResolvedValue(comment('new')) })
  it('does not expose comments of removed discussions', async () => {
    m.thread.mockResolvedValue(null)
    expect((await GET(req(), context)).status).toBe(404)
    expect(m.findMany).not.toHaveBeenCalled()
  })
  it('keeps deleted parents as redacted placeholders and returns viewer votes', async () => {
    m.findMany.mockResolvedValueOnce([comment('child', 'parent')]).mockResolvedValueOnce([comment('parent', null, true)])
    m.groupBy.mockResolvedValue([{ targetId: 'child', _sum: { value: 4 } }]); m.votes.mockResolvedValue([{ targetId: 'child', value: 1 }])
    const data = await (await GET(req('?page=2'), context)).json()
    expect(data.comments.find((c: { id: string }) => c.id === 'parent')).toMatchObject({ deleted: true, body: '', author: null, viewerVote: 0 })
    expect(data.comments.find((c: { id: string }) => c.id === 'child')).toMatchObject({ score: 4, viewerVote: 1 })
    expect(JSON.stringify(data.comments.find((c: { id: string }) => c.id === 'parent'))).not.toContain('Private removed text')
  })
  it('exposes another page without losing the extra row', async () => {
    m.findMany.mockResolvedValueOnce([comment('1'), comment('2')])
    const data = await (await GET(req('?limit=2'), context)).json()
    expect(data.hasMore).toBe(true); expect(data.comments).toHaveLength(2)
  })
  it('preserves multiline workings on creation', async () => {
    expect((await POST(post('Revenue\n\n- Costs\n- Tax'), context)).status).toBe(201)
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ body: 'Revenue\n\n- Costs\n- Tax' }) }))
  })
  it('rejects locked discussions and invalid parent comments', async () => {
    m.thread.mockResolvedValue({ locked: true }); expect((await POST(post('Reply'), context)).status).toBe(409)
    m.thread.mockResolvedValue({ locked: false }); m.parent.mockResolvedValue(null); expect((await POST(post('Reply', 'foreign-parent'), context)).status).toBe(404)
    expect(m.create).not.toHaveBeenCalled()
  })
  it('ranks top comments in the database before pagination', async () => {
    expect((await GET(req('?sort=top&page=2'), context)).status).toBe(200)
    expect(m.query.mock.calls[0][0].sql).toContain('COALESCE(v.score, 0) DESC')
    expect(m.query.mock.calls[0][0].values).toContain(50)
  })
  it('hydrates a focused older comment without widening the thread boundary', async () => {
    await GET(req('?focus=older'), context)
    expect(m.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { threadId: 't1', id: { in: ['child', '2', '3', 'older'] } } }))
  })

})
