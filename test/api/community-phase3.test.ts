// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => {
  const table = () => ({ findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), createMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), count: vi.fn() })
  const db = { user: table(), communityThread: table(), communityComment: table(), communityCategory: table(), communityBookmark: table(), communityFollow: table(), communityNotification: table(), communityPreferences: table(), communityModerationAction: table(), $queryRaw: vi.fn(), $transaction: vi.fn() }
  return { db, auth: vi.fn(), limit: vi.fn(), results: vi.fn() }
})
vi.mock('@/lib/prisma', () => ({ prisma: m.db }))
vi.mock('@/lib/auth', () => ({ getCurrentUser: m.auth }))
vi.mock('@/lib/community-server', () => ({ communityLimit: m.limit, threadResults: m.results }))
import { PATCH as updateThread, DELETE as deleteThread } from '@/app/api/community/threads/[threadId]/route'
import { PATCH as editComment, DELETE as deleteComment } from '@/app/api/community/comments/[commentId]/route'
import { PUT as bookmark } from '@/app/api/community/threads/[threadId]/bookmark/route'
import { PUT as follow } from '@/app/api/community/threads/[threadId]/follow/route'
import { GET as getNotifications, PATCH as readNotifications } from '@/app/api/community/notifications/route'
import { PUT as preferences } from '@/app/api/community/preferences/route'
import { notifyComment } from '@/lib/community-mutations'
import { POST as moderate } from '@/app/api/admin/community/moderate/route'
vi.mock('@/lib/admin-auth', () => ({ requireAdminUser: () => ({ userId: 'admin1' }) }))
const ctx = { params: Promise.resolve({ threadId: 't1' }) }
const commentCtx = { params: Promise.resolve({ commentId: 'c1' }) }
const req = (body: unknown = {}, method = 'PATCH', path = 'threads/t1') => new NextRequest(`http://localhost/api/community/${path}`, { method, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) })

describe('community phase 3 authorization and lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    m.auth.mockReturnValue({ userId: 'owner', role: 'admin' })
    m.db.user.findUnique.mockResolvedValue({ id: 'owner', role: 'student', isBanned: false })
    m.limit.mockResolvedValue(null)
    m.db.$transaction.mockImplementation(async fn => fn(m.db))
    m.db.$queryRaw.mockResolvedValue([])
    m.db.communityThread.findFirst.mockResolvedValue({ id: 't1', authorId: 'owner', postType: 'question', locked: false })
    m.db.communityComment.findFirst.mockResolvedValue({ id: 'c1', threadId: 't1', authorId: 'helper', body: 'Answer' })
    m.db.communityComment.findUnique.mockResolvedValue({ threadId: 't1' })
    m.db.communityComment.update.mockResolvedValue({ id: 'c1', body: 'Updated answer', editedAt: new Date() })
    m.db.communityPreferences.findUnique.mockResolvedValue(null)
    m.db.communityCategory.findUnique.mockResolvedValue({ id: 'accounting' })
    m.results.mockResolvedValue([{ id: 't1', solvedAt: new Date(), acceptedCommentId: 'c1' }])
  })
  it('rejects unauthenticated and banned changes', async () => {
    m.auth.mockReturnValue(null)
    expect((await updateThread(req({ action: 'solve', solved: true }), ctx)).status).toBe(401)
    m.auth.mockReturnValue({ userId: 'owner' }); m.db.user.findUnique.mockResolvedValue({ id: 'owner', isBanned: true })
    expect((await bookmark(req({ saved: true }, 'PUT'), ctx)).status).toBe(403)
    expect(m.db.$transaction).not.toHaveBeenCalled()
  })
  it('checks current database role before pinning, ignoring stale JWT admin claims', async () => {
    expect((await updateThread(req({ action: 'pin', pinned: true }), ctx)).status).toBe(403)
    m.db.user.findUnique.mockResolvedValue({ id: 'owner', role: 'admin', isBanned: false })
    expect((await updateThread(req({ action: 'pin', pinned: true }), ctx)).status).toBe(200)
    expect(m.db.communityModerationAction.create).toHaveBeenCalledWith({ data: { actorId: 'owner', actionType: 'pin', targetType: 'thread', targetId: 't1' } })
  })
  it('blocks editing, deleting and accepting on someone else’s discussion', async () => {
    m.db.communityThread.findFirst.mockResolvedValue({ id: 't1', authorId: 'other', postType: 'question' })
    for (const action of ['edit', 'accept', 'solve']) expect((await updateThread(req({ action, commentId: 'c1', solved: true }), ctx)).status).toBe(403)
    expect((await deleteThread(req({}, 'DELETE'), ctx)).status).toBe(403)
    expect(m.db.communityThread.update).not.toHaveBeenCalled()
  })
  it('accepts only a live answer from the same thread and notifies the answer author', async () => {
    expect((await updateThread(req({ action: 'accept', commentId: 'c1' }), ctx)).status).toBe(200)
    expect(m.db.communityComment.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', threadId: 't1', deleted: false } })
    expect(m.db.communityThread.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { acceptedCommentId: 'c1', solvedAt: expect.any(Date) } })
    expect(m.db.communityNotification.createMany).toHaveBeenCalledWith({ data: [{ userId: 'helper', actorId: 'owner', threadId: 't1', commentId: 'c1', kind: 'accepted_answer' }], skipDuplicates: true })
    m.db.communityComment.findFirst.mockResolvedValue(null)
    expect((await updateThread(req({ action: 'accept', commentId: 'foreign' }), ctx)).status).toBe(404)
  })
  it('honors accepted-answer notification preferences', async () => {
    m.db.communityPreferences.findUnique.mockResolvedValue({ replies: false })
    expect((await updateThread(req({ action: 'accept', commentId: 'c1' }), ctx)).status).toBe(200)
    expect(m.db.communityNotification.createMany).not.toHaveBeenCalled()
  })
  it('reopens a question and clears its accepted answer', async () => {
    expect((await updateThread(req({ action: 'solve', solved: false }), ctx)).status).toBe(200)
    expect(m.db.communityThread.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { acceptedCommentId: null, solvedAt: null } })
  })
  it('rejects solving non-questions and editing locked threads', async () => {
    m.db.communityThread.findFirst.mockResolvedValue({ authorId: 'owner', postType: 'discussion' })
    expect((await updateThread(req({ action: 'solve', solved: true }), ctx)).status).toBe(400)
    m.db.communityThread.findFirst.mockResolvedValue({ authorId: 'owner', locked: true })
    expect((await updateThread(req({ action: 'edit' }), ctx)).status).toBe(409)
  })
  it('edits a post and clears solved state when changing away from question', async () => {
    expect((await updateThread(req({ action: 'edit', title: 'A helpful resource', body: 'Here is a useful example.', postType: 'resource', categoryId: 'accounting' }), ctx)).status).toBe(200)
    expect(m.db.communityThread.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ postType: 'resource', solvedAt: null, acceptedCommentId: null, editedAt: expect.any(Date) }) }))
  })
  it('rejects owner changes to another author’s comment', async () => {
    expect((await editComment(req({ body: 'Some answer' }), commentCtx)).status).toBe(403)
    expect((await deleteComment(req({}, 'DELETE'), commentCtx)).status).toBe(403)
  })
  it('soft-deletes own answer, redacts response, reopens question, and preserves replies', async () => {
    m.db.communityComment.findFirst.mockResolvedValue({ id: 'c1', authorId: 'owner' })
    const response = await deleteComment(req({}, 'DELETE'), commentCtx)
    expect(response.status).toBe(200)
    expect((await response.json()).comment).toMatchObject({ body: '', author: null, deleted: true })
    expect(m.db.communityThread.updateMany).toHaveBeenCalledWith({ where: { acceptedCommentId: 'c1' }, data: { acceptedCommentId: null, solvedAt: null } })
    expect(m.db.communityComment.deleteMany).not.toHaveBeenCalled()
  })
  it('clears accepted answers during admin removal too', async () => {
    expect((await moderate(req({ targetType: 'comment', targetId: 'c1', actionType: 'delete' }, 'POST'))).status).toBe(200)
    expect(m.db.communityThread.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { acceptedCommentId: 'c1' } }))
  })
  it('makes saves and follows idempotent and scoped to the authenticated user', async () => {
    for (let i = 0; i < 2; i++) expect((await bookmark(req({ saved: true, userId: 'victim' }, 'PUT'), ctx)).status).toBe(200)
    expect(m.db.communityBookmark.upsert).toHaveBeenCalledWith({ where: { userId_threadId: { userId: 'owner', threadId: 't1' } }, create: { userId: 'owner', threadId: 't1' }, update: {} })
    expect((await follow(req({ following: false }, 'PUT'), ctx)).status).toBe(200)
    expect(m.db.communityFollow.deleteMany).toHaveBeenCalledWith({ where: { userId: 'owner', threadId: 't1' } })
    expect((await bookmark(req({ saved: 'true' }, 'PUT'), ctx)).status).toBe(400)
  })
  it('does not save removed discussions', async () => {
    m.db.communityThread.findFirst.mockResolvedValue(null)
    expect((await bookmark(req({ saved: true }, 'PUT'), ctx)).status).toBe(404)
    expect(m.db.communityBookmark.upsert).not.toHaveBeenCalled()
  })
  it('lists only own notifications for visible content, with pagination', async () => {
    m.db.communityNotification.findMany.mockResolvedValue([]); m.db.communityNotification.count.mockResolvedValue(3)
    const response = await getNotifications(req({}, 'GET', 'notifications?unread=true&page=2'))
    expect((await response.json()).unread).toBe(3)
    expect(m.db.communityNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner', thread: { deleted: false }, comment: { deleted: false }, readAt: null }, skip: 20, take: 21 }))
  })
  it('cannot mark another user’s notifications as read', async () => {
    expect((await readNotifications(req({ ids: ['foreign-notice'], userId: 'victim' }))).status).toBe(200)
    expect(m.db.communityNotification.updateMany).toHaveBeenCalledWith({ where: { userId: 'owner', readAt: null, id: { in: ['foreign-notice'] } }, data: { readAt: expect.any(Date) } })
  })
  it('validates preferences and saves only for the current user', async () => {
    expect((await preferences(req({ replies: 'false', followed: true }, 'PUT'))).status).toBe(400)
    expect((await preferences(req({ replies: false, followed: true, userId: 'victim' }, 'PUT'))).status).toBe(200)
    expect(m.db.communityPreferences.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner' }, update: { replies: false, followed: true } }))
  })
  it('deduplicates reply recipients and respects mutes and self-notification exclusions', async () => {
    m.db.communityFollow.findMany.mockResolvedValue([{ userId: 'owner' }, { userId: 'parent' }, { userId: 'actor' }, { userId: 'muted' }])
    m.db.user.findMany.mockResolvedValue([{ id: 'owner', communityPreferences: null }, { id: 'parent', communityPreferences: { replies: true } }, { id: 'muted', communityPreferences: { followed: false } }])
    await notifyComment(m.db as never, { id: 't1', authorId: 'owner' }, { id: 'c1', authorId: 'actor' }, 'parent')
    expect(m.db.user.findMany.mock.calls[0][0].where.id.in).toEqual(['owner', 'parent', 'muted'])
    expect(m.db.communityNotification.createMany.mock.calls[0][0].data).toEqual([
      { userId: 'owner', actorId: 'actor', threadId: 't1', commentId: 'c1', kind: 'comment' },
      { userId: 'parent', actorId: 'actor', threadId: 't1', commentId: 'c1', kind: 'reply' },
    ])
  })
})
