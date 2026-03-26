export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
        const tag = String(body.tag || '').trim()
        if (!tag) return NextResponse.json({ error: 'Tag is required' }, { status: 400 })

        // Use upsert to avoid duplicates seamlessly
        const newTag = await (prisma as any).studentTag.upsert({
            where: { studentId_tag: { studentId: parameters.studentId, tag } },
            update: {},
            create: {
                studentId: parameters.studentId,
                tag
            }
        })

        return NextResponse.json(newTag, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
    }
}
