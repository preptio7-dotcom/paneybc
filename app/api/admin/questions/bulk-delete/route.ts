export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const user = getCurrentUser(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { subject, deleteAll } = await request.json()

        let query: any = {}
        if (subject && subject !== 'all') {
            query.subject = subject
        }

        if (deleteAll === true) {
            const result = await prisma.question.deleteMany({ where: query })
            return NextResponse.json({ message: `Deleted ${result.count} questions` })
        }

        return NextResponse.json({ error: 'Deletion not confirmed' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

