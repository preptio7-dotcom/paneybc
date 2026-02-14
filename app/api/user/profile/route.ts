export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const currentUser = getCurrentUser(request)

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: currentUser.userId },
        })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ user })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = getCurrentUser(request)

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, avatar, examName, examDate, dailyQuestionGoal, prepChecklist } = await request.json()

        const updateData: Record<string, any> = {}

        if (name) updateData.name = name
        if (avatar) updateData.avatar = avatar
        if (typeof examName === 'string') updateData.examName = examName
        if (examDate) {
            const parsed = new Date(examDate)
            if (!Number.isNaN(parsed.getTime())) {
                updateData.examDate = parsed
            }
        }
        if (typeof dailyQuestionGoal === 'number') updateData.dailyQuestionGoal = dailyQuestionGoal
        if (Array.isArray(prepChecklist)) {
            updateData.prepChecklist = prepChecklist.map((item: any) => ({
                label: String(item.label || '').trim(),
                done: Boolean(item.done),
            })).filter((item: any) => item.label)
        }

        const user = await prisma.user.update({
            where: { id: currentUser.userId },
            data: updateData,
        })

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar || '/avatars/boy_1.png',
                role: user.role,
                examName: user.examName || '',
                examDate: user.examDate || null,
                dailyQuestionGoal: user.dailyQuestionGoal || 0,
                prepChecklist: user.prepChecklist || [],
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

