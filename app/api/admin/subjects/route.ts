export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } })

        // Fetch question counts for each subject + per chapter
        const subjectsWithCounts = await Promise.all(subjects.map(async (subject: any) => {
            const count = await prisma.question.count({ where: { subject: subject.code } })
            const chapterCounts = await prisma.question.groupBy({
                by: ['chapter'],
                where: { subject: subject.code },
                _count: { _all: true },
            })

            const chapterCountMap = new Map<string, number>()
            chapterCounts.forEach((row: any) => {
                chapterCountMap.set(row.chapter || '', row._count?._all || 0)
            })

            const chapters = (Array.isArray(subject.chapters) ? subject.chapters : []).map((chapter: any) => ({
                ...chapter,
                questionCount: chapterCountMap.get(chapter.code) || 0,
            }))

            const assignedCount = chapters.reduce((sum: number, ch: any) => sum + (ch.questionCount || 0), 0)
            const unassignedQuestions = Math.max(count - assignedCount, 0)

            return {
                ...subject,
                totalQuestions: count,
                chapters,
                unassignedQuestions,
            }
        }))

        return NextResponse.json({ subjects: subjectsWithCounts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = getCurrentUser(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { name, code, description } = await request.json()
        if (!name || !code) {
            return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 })
        }

        const normalizedName = name.trim()
        const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()
        const normalizedDescription = description?.trim()

        const subject = await prisma.subject.create({
            data: {
                name: normalizedName,
                code: normalizedCode,
                description: normalizedDescription,
            },
        })
        return NextResponse.json({ message: 'Subject created', subject }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = getCurrentUser(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 })
        }

        await prisma.subject.delete({ where: { id } })
        return NextResponse.json({ message: 'Subject deleted successfully' })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = getCurrentUser(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { id, name, code, description } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 })
        }
        if (!name || !code) {
            return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 })
        }

        const normalizedName = name.trim()
        const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()
        const normalizedDescription = description?.trim()

        const subject = await prisma.subject.findUnique({ where: { id } })
        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
        }

        const existing = await prisma.subject.findUnique({ where: { code: normalizedCode } })
        if (existing && existing.id !== subject.id) {
            return NextResponse.json({ error: 'Subject code already exists' }, { status: 409 })
        }

        const previousCode = subject.code
        const updated = await prisma.subject.update({
            where: { id },
            data: {
                name: normalizedName,
                code: normalizedCode,
                description: normalizedDescription,
            },
        })

        if (previousCode !== normalizedCode) {
            await prisma.question.updateMany({
                where: { subject: previousCode },
                data: { subject: normalizedCode },
            })
        }

        return NextResponse.json({ message: 'Subject updated successfully', subject: updated })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

