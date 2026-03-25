export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendFinancialStatementReportAdminEmail, sendFinancialStatementReportReceivedEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { caseId, lineItemId, section, heading, reason } = await request.json()
    if (!caseId || !section || !reason) {
      return NextResponse.json({ error: 'Case, section, and report reason are required' }, { status: 400 })
    }

    const caseData = await prisma.financialStatementCase.findUnique({
      where: { id: Number(caseId) },
    })
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    await prisma.financialStatementReport.create({
      data: {
        caseId: caseData.id,
        lineItemId: lineItemId ? Number(lineItemId) : null,
        section: String(section),
        heading: heading ? String(heading) : null,
        caseNumber: caseData.caseNumber,
        caseTitle: caseData.title,
        userId: user.userId,
        email: user.email,
        reason: String(reason),
      },
    })

    try {
      await sendFinancialStatementReportReceivedEmail(user.email, {
        caseNumber: caseData.caseNumber,
        caseTitle: caseData.title,
        section,
        heading,
      })
    } catch (emailError) {
      console.error('[EMAIL] FS report acknowledgement failed:', emailError)
    }

    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['admin', 'super_admin'] } },
        select: { email: true },
      })
      const recipientList = admins.map((a) => a.email).filter(Boolean)
      await sendFinancialStatementReportAdminEmail(recipientList, {
        reporterEmail: user.email,
        reason,
        caseNumber: caseData.caseNumber,
        caseTitle: caseData.title,
        section,
        heading,
      })
    } catch (emailError) {
      console.error('[EMAIL] FS admin report notification failed:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Financial statement report error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
