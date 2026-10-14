// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ admin: vi.fn(), report: vi.fn(), transaction: vi.fn(), remove: vi.fn(), audit: vi.fn(), update: vi.fn() }))
vi.mock('@/lib/admin-auth', () => ({ requireAdminUser: m.admin }))
vi.mock('@/lib/prisma', () => ({ prisma: { communityReport: { findUnique: m.report }, $transaction: m.transaction } }))
import { PATCH } from '@/app/api/admin/community/reports/[id]/route'
const request = () => new NextRequest('http://localhost/api/admin/community/reports/r1', { method: 'PATCH', body: JSON.stringify({ id: 'r1', action: 'delete_content' }) })
describe('community report moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks(); m.admin.mockReturnValue({ userId: 'admin1' }); m.report.mockResolvedValue({ id: 'r1', targetType: 'thread', targetId: 't1', status: 'open' })
    m.transaction.mockImplementation(async fn => fn({ $queryRaw: vi.fn().mockResolvedValue([]), communityThread: { update: m.remove }, communityModerationAction: { create: m.audit }, communityReport: { update: m.update } }))
    m.audit.mockResolvedValue({}); m.update.mockResolvedValue({ id: 'r1', status: 'resolved' })
  })
  it('removes, audits and resolves in one transaction using the authenticated administrator ID', async () => {
    expect((await PATCH(request(), { params: Promise.resolve({ id: 'r1' }) })).status).toBe(200)
    expect(m.transaction).toHaveBeenCalledOnce()
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: 'admin1' }) }))
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'resolved' } })
  })
  it('propagates audit failure out of the transaction and does not resolve the report', async () => {
    m.audit.mockRejectedValue(new Error('Audit unavailable'))
    expect((await PATCH(request(), { params: Promise.resolve({ id: '' }) })).status).toBe(500)
    expect(m.update).not.toHaveBeenCalled()
  })
  it('rejects non-admin users', async () => { m.admin.mockReturnValue(null); expect((await PATCH(request(), { params: Promise.resolve({ id: '' }) })).status).toBe(401); expect(m.transaction).not.toHaveBeenCalled() })
})
