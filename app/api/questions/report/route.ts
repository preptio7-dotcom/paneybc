export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendQuestionReportAdminEmail, sendQuestionReportReceivedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { questionId, reason, subject, questionNumber } = await request.json()
    if (!reason) {
      return NextResponse.json({ error: 'Report reason is required' }, { status: 400 })
    }

    let question = null
    if (questionId) {
      question = await prisma.question.findUnique({ where: { id: questionId } })
    } else if (subject && typeof questionNumber === 'number') {
      question = await prisma.question.findFirst({
        where: {
          subject,
          questionNumber,
        },
      })
    }
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.questionReport.create({
      data: {
        questionId: question.id,
        questionText: question.question,
        userId: user.userId,
        email: user.email,
        subject: subject || question.subject,
        questionNumber: typeof questionNumber === 'number' ? questionNumber : question.questionNumber,
        reason,
      },
    })

    try {
      await sendQuestionReportReceivedEmail(user.email, {
        subject: subject || question.subject,
        questionNumber: typeof questionNumber === 'number' ? questionNumber : question.questionNumber,
        questionText: question.question,
      })
    } catch (emailError) {
      console.error('[EMAIL] Report acknowledgement failed:', emailError)
    }

    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['admin', 'super_admin'] } },
        select: { email: true },
      })
      const recipientList = admins.map((a) => a.email).filter(Boolean)
      await sendQuestionReportAdminEmail(recipientList, {
        reporterEmail: user.email,
        reason,
        subject: subject || question.subject,
        questionNumber: typeof questionNumber === 'number' ? questionNumber : question.questionNumber,
        questionText: question.question,
      })
    } catch (emailError) {
      console.error('[EMAIL] Admin report notification failed:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Question report error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

