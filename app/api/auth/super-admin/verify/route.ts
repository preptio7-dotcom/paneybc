import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json()
        const normalizedEmail = email?.trim().toLowerCase()
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
        if (superAdminEmail && normalizedEmail !== superAdminEmail) {
            return NextResponse.json({ error: 'Use the super admin email address to verify.' }, { status: 401 })
        }

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
        }

        // 1. Find OTP
        const otp = await prisma.otp.findFirst({ where: { email: normalizedEmail, code } })
        if (!otp) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
        }

        // 2. Clear OTP
        await prisma.otp.deleteMany({ where: { email: normalizedEmail } })

        // 3. Find User to get ID and confirm role
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
        if (!user || user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
        }

        // 4. Create JWT for Super Admin session
        const token = jwt.sign(
            { id: user.id, role: 'super_admin' },
            JWT_SECRET,
            { expiresIn: '1d' }
        )

        // 5. Set Cookie
        const cookieStore = await cookies()
        cookieStore.set('super_admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        })

        return NextResponse.json({ success: true, message: 'Verified successfully' })
    } catch (error: any) {
        console.error('OTP Verification Error:', error)
        return NextResponse.json({ error: 'Server error during verification' }, { status: 500 })
    }
}

