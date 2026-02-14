export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            // For security reasons, don't reveal if user exists or not
            return NextResponse.json({ message: 'If an account exists with that email, a reset link has been sent.' })
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex')

        // Set expiration (1 hour)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken,
                resetPasswordExpires: new Date(Date.now() + 3600000),
            },
        })

        try {
            await sendPasswordResetEmail(user.email, resetToken)
            return NextResponse.json({ message: 'Reset link sent to your email.' })
        } catch (emailError: any) {
            console.error('Email send error:', emailError)
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            })
            return NextResponse.json({ error: 'Failed to send email. Please try again later.' }, { status: 500 })
        }
    } catch (error: any) {
        console.error('Forgot password error:', error)
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
    }
}

