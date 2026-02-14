export const runtime = 'nodejs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const user = getCurrentUser(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const uploads = await prisma.upload.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
        })
        return NextResponse.json({ uploads })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = getCurrentUser(request)
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        // Delete associated questions
        await prisma.question.deleteMany({ where: { uploadId: id } })

        // Delete the upload record
        await prisma.upload.delete({ where: { id } })

        return NextResponse.json({ message: 'Upload and associated questions deleted successfully' })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

