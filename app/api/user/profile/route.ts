export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { extractRegistrationSettings, normalizePkPhone, sanitizeText } from '@/lib/account-utils'

export async function GET(request: NextRequest) {
    try {
        const currentUser = getCurrentUser(request)

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: currentUser.userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                role: true,
                studentRole: true,
                degree: true,
                level: true,
                institute: true,
                city: true,
                studentId: true,
                phone: true,
                instituteRating: true,
                examName: true,
                examDate: true,
                dailyQuestionGoal: true,
                prepChecklist: true,
                practiceStreakCurrent: true,
                practiceStreakBest: true,
                practiceStreakLastDate: true,
                badges: {
                    select: {
                        badgeType: true,
                        earnedAt: true,
                        seen: true,
                    },
                    orderBy: { earnedAt: 'asc' },
                },
                createdAt: true,
            },
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

        const body = await request.json()
        const { name, avatar, examName, examDate, dailyQuestionGoal, prepChecklist } = body

        const updateData: Record<string, any> = {}

        if (typeof avatar === 'string' && avatar.trim()) updateData.avatar = avatar.trim()
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

        const wantsProfileUpdate =
            ['name', 'degree', 'level', 'institute', 'city', 'studentId', 'phone', 'instituteRating', 'avatar'].some(
                (key) => Object.prototype.hasOwnProperty.call(body, key)
            )

        if (wantsProfileUpdate) {
            const normalizedName = sanitizeText(name || '', 100)
            const normalizedDegree = sanitizeText(body.degree || '', 40)
            const normalizedLevel = sanitizeText(body.level || '', 40)
            const normalizedInstitute = sanitizeText(body.institute || '', 120)
            const normalizedCity = sanitizeText(body.city || '', 80)
            const normalizedStudentId = sanitizeText(body.studentId || '', 60)
            const normalizedPhone = normalizePkPhone(body.phone || '')
            const rating = Number(body.instituteRating)

            if (!normalizedName || !normalizedDegree || !normalizedLevel || !normalizedInstitute || !normalizedCity || !normalizedStudentId || !normalizedPhone) {
                return NextResponse.json({ error: 'Please complete all required profile fields' }, { status: 400 })
            }

            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                return NextResponse.json({ error: 'Institute rating must be between 1 and 5' }, { status: 400 })
            }

            const settings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
            const registrationSettings = extractRegistrationSettings(settings?.testSettings || {})
            if (!registrationSettings.degrees.includes(normalizedDegree)) {
                return NextResponse.json({ error: 'Selected degree is no longer available' }, { status: 400 })
            }
            if (!registrationSettings.levels.includes(normalizedLevel)) {
                return NextResponse.json({ error: 'Selected level is no longer available' }, { status: 400 })
            }

            const duplicate = await prisma.user.findFirst({
                where: {
                    id: { not: currentUser.userId },
                    OR: [{ phone: normalizedPhone }, { studentId: normalizedStudentId }],
                },
                select: { phone: true, studentId: true },
            })
            if (duplicate) {
                if (duplicate.phone === normalizedPhone) {
                    return NextResponse.json({ error: 'Phone number is already in use' }, { status: 409 })
                }
                if (duplicate.studentId === normalizedStudentId) {
                    return NextResponse.json({ error: 'Student ID is already in use' }, { status: 409 })
                }
            }

            updateData.name = normalizedName
            updateData.degree = normalizedDegree
            updateData.level = normalizedLevel
            updateData.institute = normalizedInstitute
            updateData.city = normalizedCity
            updateData.studentId = normalizedStudentId
            updateData.phone = normalizedPhone
            updateData.instituteRating = rating
        }

        const user = await prisma.user.update({
            where: { id: currentUser.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                role: true,
                studentRole: true,
                degree: true,
                level: true,
                institute: true,
                city: true,
                studentId: true,
                phone: true,
                instituteRating: true,
                examName: true,
                examDate: true,
                dailyQuestionGoal: true,
                prepChecklist: true,
                practiceStreakCurrent: true,
                practiceStreakBest: true,
                practiceStreakLastDate: true,
                badges: {
                    select: {
                        badgeType: true,
                        earnedAt: true,
                        seen: true,
                    },
                    orderBy: { earnedAt: 'asc' },
                },
                createdAt: true,
            },
        })

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar || '/avatars/boy_1.png',
                role: user.role,
                studentRole: user.studentRole,
                degree: user.degree || '',
                level: user.level || '',
                institute: user.institute || '',
                city: user.city || '',
                studentId: user.studentId || '',
                phone: user.phone || '',
                instituteRating: user.instituteRating || 0,
                examName: user.examName || '',
                examDate: user.examDate || null,
                dailyQuestionGoal: user.dailyQuestionGoal || 0,
                prepChecklist: user.prepChecklist || [],
                practiceStreakCurrent: user.practiceStreakCurrent || 0,
                practiceStreakBest: user.practiceStreakBest || 0,
                practiceStreakLastDate: user.practiceStreakLastDate || null,
                badges: user.badges || [],
                createdAt: user.createdAt,
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

