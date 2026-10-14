// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ query: vi.fn(), results: vi.fn(), auth: vi.fn(), participate: vi.fn(), limit: vi.fn(), category: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getCurrentUser: m.auth }))
vi.mock('@/lib/community-server', () => ({ canParticipate: m.participate, communityLimit: m.limit, threadResults: m.results }))
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: m.query, communityCategory: { findUnique: m.category }, communityThread: { create: m.create } } }))
import { GET, POST } from '@/app/api/community/threads/route'
import { GET as getThread } from '@/app/api/community/threads/[threadId]/route'
describe('community feed and direct discussions', () => {
  beforeEach(() => { vi.clearAllMocks(); m.auth.mockReturnValue({ userId: 'u1' }); m.participate.mockResolvedValue(true); m.limit.mockResolvedValue(null); m.query.mockResolvedValue([{ id: 'old-popular' }, { id: 'next' }]); m.results.mockResolvedValue([{ id: 'old-popular', score: 20, viewerVote: 1 }]); m.category.mockResolvedValue({ id: 'a1' }); m.create.mockResolvedValue({ id: 'created' }) })
  it('ranks all matching posts and limits only after sorting', async () => {
    const data = await (await GET(new NextRequest('http://localhost/api/community/threads?sort=top&limit=1&page=2&category=accounting'))).json()
    expect(data.hasMore).toBe(true)
    const sql = m.query.mock.calls[0][0]
    expect(sql.sql).toContain('SUM(value)')
    expect(sql.sql).not.toContain('200')
    expect(sql.values).toContain('accounting')
    expect(m.results).toHaveBeenCalledWith(['old-popular'], 'u1')
  })
  it('loads a shared discussion independently of feed position', async () => {
    const response = await getThread(new NextRequest('http://localhost/api/community/threads/old-popular'), { params: Promise.resolve({ threadId: 'old-popular' }) })
    expect(response.status).toBe(200)
    expect(m.query).not.toHaveBeenCalled()
    expect(m.results).toHaveBeenCalledWith(['old-popular'], 'u1')
  })
  it('returns a useful missing discussion response', async () => {
    m.results.mockResolvedValue([])
    expect((await getThread(new NextRequest('http://localhost/api/community/threads/removed'), { params: Promise.resolve({ threadId: 'removed' }) })).status).toBe(404)
  })
  it('rejects bad pagination before querying', async () => {
    expect((await GET(new NextRequest('http://localhost/api/community/threads?page=NaN'))).status).toBe(400)
    expect(m.query).not.toHaveBeenCalled()
  })
  it('preserves paragraphs and rejects oversized posts without silently truncating', async () => {
    const request = (body: string) => new NextRequest('http://localhost/api/community/threads', { method: 'POST', body: JSON.stringify({ title: 'A clear question', body, categoryId: 'a1' }) })
    expect((await POST(request('Paragraph one\n\nParagraph two'))).status).toBe(201)
    expect(m.create).toHaveBeenCalledWith({ data: { title: 'A clear question', body: 'Paragraph one\n\nParagraph two', categoryId: 'a1', postType: 'discussion', authorId: 'u1' } })
    expect((await POST(request('x'.repeat(10001)))).status).toBe(400)
    expect(m.create).toHaveBeenCalledOnce()
  })
  it('parameterizes full-text search and combines saved, subject, label and time filters', async () => {
    const q = "cash '); DROP TABLE users; --"
    const params = new URLSearchParams({ q, view: 'saved', sort: 'top', range: 'week', type: 'question', status: 'unanswered', category: 'accounting' })
    expect((await GET(new NextRequest(`http://localhost/api/community/threads?${params}`))).status).toBe(200)
    const sql = m.query.mock.calls[0][0]
    expect(sql.sql).toContain('websearch_to_tsquery')
    expect(sql.sql).not.toContain(q)
    expect(sql.values).toContain(q)
    expect(sql.values).toContain('u1')
    expect(sql.sql).toContain('community_bookmarks')
    expect(sql.sql).toContain('t.solved_at IS NULL')
    expect(sql.sql).toContain('t.pinned_at DESC NULLS LAST')
    expect(sql.values.some((v: unknown) => v instanceof Date)).toBe(true)
  })
  it('protects personal collections and rejects invalid filters', async () => {
    m.auth.mockReturnValue(null)
    expect((await GET(new NextRequest('http://localhost/api/community/threads?view=saved'))).status).toBe(401)
    expect((await GET(new NextRequest('http://localhost/api/community/threads?type=unknown'))).status).toBe(400)
    expect(m.query).not.toHaveBeenCalled()
  })

})
