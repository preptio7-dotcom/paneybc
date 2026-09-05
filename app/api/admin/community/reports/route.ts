import { requireAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const admin = requireAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const statusParam = request.nextUrl.searchParams.get('status') || 'open'
    const whereClause: any = {}
    if (statusParam !== 'all') {
      whereClause.status = statusParam
    }

    const reports = await prisma.communityReport.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    // Fetch target thread/comment previews for each report
    const threadIds = reports.filter((r) => r.targetType === 'thread').map((r) => r.targetId)
    const commentIds = reports.filter((r) => r.targetType === 'comment').map((r) => r.targetId)

    const [threads, comments] = await Promise.all([
      threadIds.length > 0
        ? prisma.communityThread.findMany({
            where: { id: { in: threadIds } },
            select: {
              id: true,
              title: true,
              body: true,
              authorId: true,
              deleted: true,
              locked: true,
              createdAt: true,
              author: { select: { id: true, name: true } },
            },
          })
        : [],
      commentIds.length > 0
        ? prisma.communityComment.findMany({
            where: { id: { in: commentIds } },
            select: {
              id: true,
              threadId: true,
              body: true,
              authorId: true,
              deleted: true,
              createdAt: true,
              author: { select: { id: true, name: true } },
              thread: { select: { id: true, title: true } },
            },
          })
        : [],
    ])

    const threadMap = new Map(threads.map((t) => [t.id, t]))
    const commentMap = new Map(comments.map((c) => [c.id, c]))

    const enrichedReports = reports.map((report) => {
      let targetContent: any = null
      if (report.targetType === 'thread') {
        targetContent = threadMap.get(report.targetId) || null
      } else if (report.targetType === 'comment') {
        targetContent = commentMap.get(report.targetId) || null
      }
      return {
        ...report,
        targetContent,
      }
    })

    return NextResponse.json({ reports: enrichedReports })
  } catch (error) {
    console.error('Community report queue error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}
