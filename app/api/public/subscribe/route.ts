export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const { subscription } = await request.json()
        const endpoint = subscription?.endpoint

        // Check if already exists
        if (!endpoint) {
            return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
        }

        const exists = await prisma.pushSubscription.findUnique({ where: { endpoint } })
        if (exists) {
            return NextResponse.json({ success: true, message: 'Already subscribed' })
        }

        const user = getCurrentUser(request as any)
        await prisma.pushSubscription.create({
            data: { subscription, userId: user?.userId, endpoint },
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Subscription error:', error)
        return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }
}

