export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
    req: NextRequest,
    { params }: { params: { studentId: string, tag: string } }
) {
    try {
        const user = getCurrentUser(req)
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Temporary typecast
        const parameters = await params
        await (prisma as any).studentTag.delete({
            where: { studentId_tag: { studentId: parameters.studentId, tag: parameters.tag } }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
    }
}
