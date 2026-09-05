export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
    try {
        if (!(await requireSuperAdmin(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch all messages sorted by date
        const messages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ messages })
    } catch (error: any) {
        console.error('Contact List API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

