export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
    try {
        // 1. Verify super admin session
        const cookieStore = await cookies()
        const superAdminToken = cookieStore.get('super_admin_session')?.value
        if (!superAdminToken) {
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

