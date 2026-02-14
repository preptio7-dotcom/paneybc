export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendQuestionReportReplyEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const user = getCurrentUser(request)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const resolvedParams = await params
        const { id } = resolvedParams
        if (!id) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
        }

        const body = await request.json()
        const {
            question,
            imageUrl,
            options,
            correctAnswer,
            correctAnswers,
            allowMultiple,
            maxSelections,
            explanation,
            difficulty,
            subject,
            chapter,
            questionNumber,
        } = body

        if (!question || !options || !explanation) {
            return NextResponse.json({ error: 'Question, options, and explanation are required' }, { status: 400 })
        }

        if (!Array.isArray(options) || options.length !== 4) {
            return NextResponse.json({ error: 'Must have exactly 4 options' }, { status: 400 })
        }

        if (allowMultiple) {
            if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
                return NextResponse.json({ error: 'Select at least one correct answer' }, { status: 400 })
            }
            const invalid = correctAnswers.some((idx: number) => idx < 0 || idx > 3)
            if (invalid) {
                return NextResponse.json({ error: 'Correct answers must be between 0 and 3' }, { status: 400 })
            }
        } else {
            if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer > 3) {
                return NextResponse.json({ error: 'Correct answer must be between 0 and 3' }, { status: 400 })
            }
        }

        const updatePayload: any = {
            question,
            imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() || null : null,
            options,
            explanation,
            difficulty,
            subject,
            chapter,
            questionNumber,
            allowMultiple: Boolean(allowMultiple),
            maxSelections: allowMultiple ? (maxSelections || 2) : 1,
            correctAnswer: allowMultiple ? null : correctAnswer,
            correctAnswers: allowMultiple ? correctAnswers : [],
        }

        const reports = await prisma.questionReport.findMany({
            where: { questionId: id, status: { not: 'resolved' } },
        })

        const [updated] = await prisma.$transaction([
            prisma.question.update({
                where: { id },
                data: updatePayload,
            }),
            prisma.questionReport.deleteMany({ where: { questionId: id } }),
        ])
        if (!updated) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 })
        }

        if (reports.length > 0) {
            const message =
                'Thanks for reporting this question. We reviewed it and corrected the content. The question is now updated in the app. We appreciate your help.'
            const uniqueEmails = Array.from(new Set(reports.map((report) => report.email).filter(Boolean)))
            for (const email of uniqueEmails) {
                try {
                    const sample = reports.find((r) => r.email === email)
                    await sendQuestionReportReplyEmail(email, message, {
                        subject: sample?.subject,
                        questionNumber: sample?.questionNumber,
                        questionText: updatePayload.question,
                    })
                } catch (emailError) {
                    console.error('[EMAIL] Report update notification failed:', emailError)
                }
            }
        }

        return NextResponse.json({
            message: 'Question updated successfully',
            question: updated,
            reportsCleared: reports.length,
        })
    } catch (error: any) {
        console.error('Update question error:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const user = getCurrentUser(request)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const resolvedParams = await params
        const { id } = resolvedParams

        if (!id) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
        }

        await prisma.question.delete({ where: { id } })

        return NextResponse.json({ message: 'Question deleted successfully' })
    } catch (error: any) {
        console.error('Delete question error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

