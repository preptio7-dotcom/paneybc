import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pagination } from '@/lib/community-input'
import { communityActor, CommunityError, mutationError, mutationLimit } from '@/lib/community-mutations'

export async function GET(request: NextRequest) {
  try {
    const actor = await communityActor(request)
    const paging = pagination(request.nextUrl.searchParams, 20, 50)
    if (!paging) throw new CommunityError('Invalid page.', 400)
    const where = { userId: actor.id, thread: { deleted: false }, comment: { deleted: false } }
    const [rows, unread] = await Promise.all([
      prisma.communityNotification.findMany({ where: { ...where, ...(request.nextUrl.searchParams.get('unread') === 'true' ? { readAt: null } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: paging.skip, take: paging.limit + 1, select: { id: true, kind: true, readAt: true, createdAt: true, commentId: true, actor: { select: { name: true } }, thread: { select: { id: true, title: true } } } }),
      prisma.communityNotification.count({ where: { ...where, readAt: null } }),
    ])
    return NextResponse.json({ notifications: rows.slice(0, paging.limit), unread, hasMore: rows.length > paging.limit }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return mutationError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await communityActor(request)
    const limited = await mutationLimit(actor.id)
    if (limited) return limited
    const body = await request.json().catch(() => null)
    if (body?.all !== true && (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 50 || body.ids.some((id: unknown) => typeof id !== 'string' || id.length > 80))) throw new CommunityError('Choose notifications to mark as read.', 400)
    await prisma.communityNotification.updateMany({ where: { userId: actor.id, readAt: null, ...(body.all === true ? {} : { id: { in: body.ids } }) }, data: { readAt: new Date() } })
    return NextResponse.json({ success: true })
  } catch (error) { return mutationError(error) }
}
