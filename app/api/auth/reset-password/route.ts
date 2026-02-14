export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json()

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex')

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { gt: new Date() },
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
        }

        // Set new password
        const hashedPassword = await bcryptjs.hash(password, 10)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        })

        return NextResponse.json({ message: 'Password reset successful' })
    } catch (error: any) {
        console.error('Reset password error:', error)
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
    }
}

