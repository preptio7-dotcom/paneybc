import { requireAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = requireAdminUser(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const reportId = params.id
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const report = await prisma.communityReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, action } = body

    let newStatus = report.status
    if (status && ['open', 'reviewed', 'resolved'].includes(status)) {
      newStatus = status as any
    }

    let actionTaken = null

    // If admin chooses to delete reported content
    if (action === 'delete_content') {
      if (report.targetType === 'thread') {
        await prisma.communityThread.update({
          where: { id: report.targetId },
          data: { deleted: true },
        })
      } else if (report.targetType === 'comment') {
        await prisma.communityComment.update({
          where: { id: report.targetId },
          data: { deleted: true },
        })
      }

      // Log moderation action
      await prisma.communityModerationAction.create({
        data: {
          actorId: admin.id,
          actionType: 'delete',
          targetType: report.targetType as any,
          targetId: report.targetId,
          reason: `Removed based on report ${report.id}`,
        },
      })

      newStatus = 'resolved'
      actionTaken = 'delete_content'
    }

    const updatedReport = await prisma.communityReport.update({
      where: { id: reportId },
      data: { status: newStatus },
    })

    return NextResponse.json({
      success: true,
      report: updatedReport,
      actionTaken,
    })
  } catch (error) {
    console.error('Failed to update community report:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
