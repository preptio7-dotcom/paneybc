import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canParticipate, communityLimit, threadResults } from '@/lib/community-server'
import { communityText, pagination } from '@/lib/community-input'
import { NextRequest, NextResponse } from 'next/server'
import { isPostType } from '@/lib/community-options'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams
    const paging = pagination(search, 15, 30)
    if (!paging) return NextResponse.json({ error: 'Invalid page or limit.' }, { status: 400 })
    const { page, limit, skip } = paging
    const sort = search.get('sort') || 'hot'
    if (!['hot', 'new', 'top'].includes(sort)) return NextResponse.json({ error: 'Invalid sort.' }, { status: 400 })
    const category = communityText(search.get('category'))
    const q = communityText(search.get('q'))
    const postType = search.get('type') || ''
    const status = search.get('status') || ''
    const view = search.get('view') || 'all'
    const range = search.get('range') || 'all'
    const viewerId = getCurrentUser(request)?.userId
    if (q.length > 120 || category.length > 80 || (postType && !isPostType(postType)) || !['', 'unanswered', 'solved'].includes(status) || !['all', 'saved', 'following'].includes(view) || !['day', 'week', 'month', 'all'].includes(range)) return NextResponse.json({ error: 'Invalid search or filter.' }, { status: 400 })
    if (view !== 'all' && !viewerId) return NextResponse.json({ error: 'Please log in to see your saved or followed discussions.' }, { status: 401 })
    const days = range === 'day' ? 1 : range === 'week' ? 7 : 30
    // Rank the entire community in PostgreSQL. All user input is parameterized.
    const ranking = sort === 'new' ? Prisma.sql`t.created_at DESC` : sort === 'top'
      ? Prisma.sql`COALESCE(v.score, 0) DESC`
      : Prisma.sql`(CASE WHEN COALESCE(v.score, 0) > 0 THEN v.score / POWER(GREATEST(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600, 1) + 2, 0.8) ELSE COALESCE(v.score, 0) END) DESC`
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT t.id FROM community_threads t
      JOIN community_categories c ON c.id = t.category_id
      LEFT JOIN (SELECT target_id, SUM(value)::double precision AS score FROM community_votes WHERE target_type = 'thread' GROUP BY target_id) v ON v.target_id = t.id
      WHERE t.deleted = false ${category ? Prisma.sql`AND c.slug = ${category}` : Prisma.empty}
      ${q ? Prisma.sql`AND to_tsvector('simple', t.title || ' ' || t.body) @@ websearch_to_tsquery('simple', ${q})` : Prisma.empty}
      ${postType ? Prisma.sql`AND t.post_type::text = ${postType}` : Prisma.empty}
      ${status === 'unanswered' ? Prisma.sql`AND t.post_type = 'question' AND t.solved_at IS NULL` : status === 'solved' ? Prisma.sql`AND t.post_type = 'question' AND t.solved_at IS NOT NULL` : Prisma.empty}
      ${view === 'saved' ? Prisma.sql`AND EXISTS (SELECT 1 FROM community_bookmarks b WHERE b.thread_id = t.id AND b.user_id = ${viewerId})` : view === 'following' ? Prisma.sql`AND EXISTS (SELECT 1 FROM community_follows f WHERE f.thread_id = t.id AND f.user_id = ${viewerId})` : Prisma.empty}
      ${sort === 'top' && range !== 'all' ? Prisma.sql`AND t.created_at >= ${new Date(Date.now() - days * 86400000)}` : Prisma.empty}
      ORDER BY t.pinned_at DESC NULLS LAST, ${ranking}, t.created_at DESC, t.id DESC
      LIMIT ${limit + 1} OFFSET ${skip}`)
    const threads = await threadResults(rows.slice(0, limit).map(r => r.id), viewerId)
    return NextResponse.json({ threads, page, limit, hasMore: rows.length > limit }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Community feed error:', error)
    return NextResponse.json({ error: 'Unable to load discussions. Please try again.' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Please log in to post.' }, { status: 401 })
    if (!await canParticipate(user.userId)) return NextResponse.json({ error: 'Account cannot post.' }, { status: 403 })
    const body = await request.json().catch(() => null)
    const title = communityText(body?.title)
    const content = communityText(body?.body, true)
    const categoryId = communityText(body?.categoryId)
    const postType = body?.postType ?? 'discussion'
    if (!isPostType(postType)) return NextResponse.json({ error: 'Choose a valid post label.' }, { status: 400 })
    if (title.length < 5 || title.length > 160 || content.length < 10 || content.length > 10000 || !categoryId || categoryId.length > 80) {
      return NextResponse.json({ error: 'Choose a subject, a title of 5–160 characters, and a post of 10–10,000 characters.' }, { status: 400 })
    }
    const category = await prisma.communityCategory.findUnique({ where: { id: categoryId } })
    if (!category) return NextResponse.json({ error: 'Subject not found.' }, { status: 404 })
    const limited = await communityLimit(user.userId, 'thread')
    if (limited) return limited
    const thread = await prisma.communityThread.create({ data: { title, body: content, categoryId, postType, authorId: user.userId } })
    const [result] = await threadResults([thread.id], user.userId)
    return NextResponse.json({ thread: result }, { status: 201 })
  } catch (error) {
    console.error('Community create error:', error)
    return NextResponse.json({ error: 'Unable to publish. Your draft has been kept.' }, { status: 500 })
  }
}
