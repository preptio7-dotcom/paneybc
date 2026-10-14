import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { communityActor, CommunityError, mutationError, mutationLimit } from '@/lib/community-mutations'
export async function GET(request: NextRequest) {
  try {
    const actor = await communityActor(request)
    const preferences = await prisma.communityPreferences.findUnique({ where: { userId: actor.id }, select: { replies: true, followed: true } })
    return NextResponse.json({ preferences: preferences || { replies: true, followed: true } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return mutationError(error) }
}
export async function PUT(request: NextRequest) {
  try {
    const actor = await communityActor(request)
    const limited = await mutationLimit(actor.id)
    if (limited) return limited
    const body = await request.json().catch(() => null)
    if (typeof body?.replies !== 'boolean' || typeof body?.followed !== 'boolean') throw new CommunityError('Invalid notification preferences.', 400)
    const data = { replies: body.replies, followed: body.followed }
    await prisma.communityPreferences.upsert({ where: { userId: actor.id }, create: { userId: actor.id, ...data }, update: data })
    return NextResponse.json({ preferences: data })
  } catch (error) { return mutationError(error) }
}
