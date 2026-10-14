export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
    req: NextRequest,
    { params }: { params: { studentId: string } }
) {
    try {
        const user = getCurrentUser(req)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const parameters = await params
        const notes = await (prisma as any).studentNote.findMany({
            where: { studentId: parameters.studentId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(notes)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: { studentId: string } }
) {
    try {
        const user = getCurrentUser(req)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const parameters = await params
        const body = await req.json()
        const content = String(body.content || '').trim()
        if (!content) {
            return NextResponse.json({ error: 'Note content required' }, { status: 400 })
        }

        const newNote = await (prisma as any).studentNote.create({
            data: {
                studentId: parameters.studentId,
                adminId: user.userId || 'system',
                note: content
            }
        })

        return NextResponse.json(newNote, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
}
