import { clearAcceptedAnswer, lockModerationTarget } from '@/lib/community-mutations'
import { requireAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = requireAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const resolvedParams = await context?.params
    const body = await request.json().catch(() => ({}))
    const reportId = resolvedParams?.id || body?.id

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const report = await prisma.communityReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { status, action } = body
    if ((status && !['open', 'reviewed', 'resolved'].includes(status)) || (action && action !== 'delete_content') || (!status && !action)) return NextResponse.json({ error: 'Invalid moderation update' }, { status: 400 })

    return await prisma.$transaction(async tx => {
      let newStatus = report.status
      if (status && ['open', 'reviewed', 'resolved'].includes(status)) {
        newStatus = status as any
      }

      let actionTaken = null

      // If admin chooses to delete reported content
      if (action === 'delete_content') {
        await lockModerationTarget(tx, report.targetType, report.targetId)
        if (report.targetType === 'thread') {
          await tx.communityThread.update({
            where: { id: report.targetId },
            data: { deleted: true },
          })
        } else if (report.targetType === 'comment') {
          await tx.communityComment.update({
            where: { id: report.targetId },
            data: { deleted: true },
          })
        }

        if (report.targetType === 'comment') await clearAcceptedAnswer(tx, report.targetId)
        // Log moderation action
        await tx.communityModerationAction.create({
          data: {
            actorId: admin.userId,
            actionType: 'delete',
            targetType: report.targetType as any,
            targetId: report.targetId,
            reason: `Removed based on report ${report.id}`,
          },
        })

        newStatus = 'resolved'
        actionTaken = 'delete_content'
      }

      const updatedReport = await tx.communityReport.update({
        where: { id: reportId },
        data: { status: newStatus },
      })

      return NextResponse.json({
        success: true,
        report: updatedReport,
        actionTaken,
      })
    })
  } catch (error) {
    console.error('Failed to update community report:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
