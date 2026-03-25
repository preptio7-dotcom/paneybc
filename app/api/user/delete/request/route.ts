export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcryptjs from 'bcryptjs'
import { sendAccountDeletionOTPEmail } from '@/lib/email'

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString()

export async function POST(request: Request) {
  try {
    const tokenUser = getCurrentUser(request as any)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { password } = await request.json()
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { email: true, password: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await bcryptjs.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    await prisma.otp.deleteMany({ where: { email: user.email, purpose: { in: ['account_delete', 'account_delete_confirm'] } } })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await prisma.otp.create({
      data: {
        email: user.email,
        code,
        purpose: 'account_delete',
        expiresAt,
      },
    })

    await sendAccountDeletionOTPEmail(user.email, code)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Account delete request error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const tokenUser = getCurrentUser(request as any)
    if (!tokenUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { email: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.otp.deleteMany({ where: { email: user.email, purpose: 'account_delete' } })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await prisma.otp.create({
      data: {
        email: user.email,
        code,
        purpose: 'account_delete',
        expiresAt,
      },
    })

    await sendAccountDeletionOTPEmail(user.email, code)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Account delete resend error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
