export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendQuestionReportReplyEmail } from '@/lib/email'

const isAdmin = (req: NextRequest) => {
  const user = getCurrentUser(req)
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'))
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const { id: paramId } = resolvedParams
    const { message, status, reportId } = await req.json()
    const id = paramId || reportId

    if (!id || !message) {
      return NextResponse.json({ error: 'Report ID and message are required' }, { status: 400 })
    }

    const report = await prisma.questionReport.findUnique({ where: { id } })
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    let questionText = report.questionText
    if (!questionText) {
      const question = await prisma.question.findUnique({ where: { id: report.questionId } })
      questionText = question?.question || ''
    }

    const updated = await prisma.questionReport.update({
      where: { id },
      data: {
        adminReply: message,
        repliedAt: new Date(),
        status: status || 'reviewed',
        questionText,
      },
    })

    let emailSent = true
    try {
      await sendQuestionReportReplyEmail(updated.email, message, {
        subject: updated.subject,
        questionNumber: updated.questionNumber,
        questionText: questionText,
      })
    } catch (emailError) {
      emailSent = false
      console.error('[EMAIL] Report reply failed:', emailError)
    }

    return NextResponse.json({ success: true, report: updated, emailSent })
  } catch (error: any) {
    console.error('Admin report reply error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const id = resolvedParams.id
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    await prisma.questionReport.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin report delete error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const resolvedParams = await params
    const id = resolvedParams.id
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const updated = await prisma.questionReport.update({
      where: { id },
      data: { status: 'resolved', repliedAt: new Date() },
    })

    return NextResponse.json({ success: true, report: updated })
  } catch (error: any) {
    console.error('Admin report resolve error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

