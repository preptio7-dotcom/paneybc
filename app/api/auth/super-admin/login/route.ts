import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendOTPEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Trim and lowercase email to avoid input issues
        const email = body.email?.trim().toLowerCase()
        const password = body.password?.trim()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
        if (superAdminEmail && email !== superAdminEmail) {
            return NextResponse.json({ error: 'Use the super admin email address to login.' }, { status: 401 })
        }

        const targetEmail = superAdminEmail || email

        console.log(`[AUTH] Login attempt for: ${targetEmail}`)

        // 1. Find user (explicitly selecting password)
        const user = await prisma.user.findUnique({
            where: { email: targetEmail },
            select: { id: true, email: true, role: true, password: true, isBanned: true },
        })

        if (!user) {
            console.log(`[AUTH] User not found: ${targetEmail}`)
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        if (user.role !== 'super_admin') {
            console.log(`[AUTH] User exists but is not super_admin: ${email} (${user.role})`)
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
        }

        if (user.isBanned) {
            return NextResponse.json({ error: 'Your account is blocked. Please contact support for help.' }, { status: 403 })
        }

        // 2. Verify password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            console.log(`[AUTH] Password mismatch for: ${email}`)
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // 3. Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        // 4. Save OTP (expires in 10 minutes)
        await prisma.otp.deleteMany({ where: { email: targetEmail } })
        await prisma.otp.create({
            data: {
                email: targetEmail,
                code,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        })

        // 5. Send OTP via Email
        try {
            console.log(`[EMAIL] Attempting to send OTP to: ${targetEmail}`)
            await sendOTPEmail(targetEmail, code)
            console.log(`[EMAIL] OTP sent successfully to: ${targetEmail}`)
        } catch (emailError: any) {
            console.error('[EMAIL] Delivery Failed:', emailError)
            return NextResponse.json({
                error: 'Credentials verified, but failed to send email. Check SMTP settings in .env'
            }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' })
    } catch (error: any) {
        console.error('[AUTH] Super Admin Login Error:', error)
        return NextResponse.json({ error: 'Server error during login' }, { status: 500 })
    }
}

