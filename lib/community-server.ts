import { prisma } from '@/lib/prisma'
import { enforceKeyRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

export async function communityLimit(userId: string, scope: string, maxRequests = 1, windowSeconds = 15) {
  const result = await enforceKeyRateLimit(`user:${userId}`, { scope: `community:${scope}`, maxRequests, windowSeconds })
  if (result.allowed) return null
  return NextResponse.json({ error: `Please wait ${result.retryAfterSeconds} seconds before trying again.`, retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } })
}

export async function canParticipate(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isBanned: true } })
  return !!user && !user.isBanned
}

export const ANON_AUTHOR = { id: 'anonymous', name: 'Anonymous', avatar: null } as const

export const threadInclude = {
  category: { select: { id: true, name: true, slug: true, description: true } },
  author: { select: { id: true, name: true, avatar: true } },
  _count: { select: { comments: { where: { deleted: false } } } },
} as const

/**
 * Resolve the displayed author for a thread/comment.
 * - If not anonymous: return the real author.
 * - If anonymous AND viewer is admin/super_admin: return ANON_AUTHOR but also pass realAuthor.
 * - If anonymous AND viewer is regular: return ANON_AUTHOR, no realAuthor.
 */
export function resolveAuthor(
  realAuthor: { id: string; name: string; avatar: string | null },
  isAnonymous: boolean,
  viewerRole?: string | null,
  viewerId?: string | null,
) {
  if (!isAnonymous) return { author: realAuthor, realAuthor: null }
  const isMod = viewerRole === 'admin' || viewerRole === 'super_admin'
  const isSelf = Boolean(viewerId && viewerId === realAuthor.id)
  return {
    author: ANON_AUTHOR,
    realAuthor: (isMod || isSelf) ? realAuthor : null,
  }
}

export async function threadResults(ids: string[], viewerId?: string, viewerRole?: string | null) {
  if (!ids.length) return []
  const [threads, totals, mine, bookmarks, follows] = await Promise.all([
    prisma.communityThread.findMany({ where: { id: { in: ids }, deleted: false }, include: threadInclude }),
    prisma.communityVote.groupBy({ by: ['targetId'], where: { targetType: 'thread', targetId: { in: ids } }, _sum: { value: true } }),
    viewerId ? prisma.communityVote.findMany({ where: { userId: viewerId, targetType: 'thread', targetId: { in: ids } }, select: { targetId: true, value: true } }) : [],
    viewerId ? prisma.communityBookmark.findMany({ where: { userId: viewerId, threadId: { in: ids } }, select: { threadId: true } }) : [],
    viewerId ? prisma.communityFollow.findMany({ where: { userId: viewerId, threadId: { in: ids } }, select: { threadId: true } }) : [],
  ])
  const scores = new Map(totals.map(v => [v.targetId, v._sum.value || 0]))
  const votes = new Map(mine.map(v => [v.targetId, v.value]))
  const saved = new Set(bookmarks.map(b => b.threadId))
  const followed = new Set(follows.map(f => f.threadId))
  const mapped = new Map(threads.map(({ _count, ...thread }) => {
    const { author, realAuthor } = resolveAuthor(thread.author, thread.isAnonymous, viewerRole, viewerId)
    return [thread.id, {
      ...thread,
      author,
      realAuthor,
      isOwner: Boolean(viewerId && viewerId === thread.authorId),
      saved: saved.has(thread.id),
      following: followed.has(thread.id),
      score: scores.get(thread.id) || 0,
      viewerVote: votes.get(thread.id) || 0,
      commentCount: _count.comments,
    }]
  }))
  return ids.flatMap(id => mapped.has(id) ? [mapped.get(id)!] : [])
}
