export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'
const SESSION_JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, degree, level, verificationToken } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!verificationToken) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 401 })
    }

    try {
      const payload = jwt.verify(verificationToken, JWT_SECRET) as { email: string; purpose?: string }
      if (payload.email !== email || payload.purpose !== 'signup') {
        return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 401 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const hashedPassword = await bcryptjs.hash(password, 10)

    const user = await prisma.user.create({
      data: {
      email,
      password: hashedPassword,
      name,
      role: 'student',
      degree,
      level,
      },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    })

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || '/avatars/boy_1.png',
          role: user.role,
        },
      },
      { status: 201 }
    )

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, SESSION_JWT_SECRET, {
      expiresIn: '7d',
    })

    const cookieDomain = process.env.COOKIE_DOMAIN
    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      ...(isProd && cookieDomain ? { domain: cookieDomain } : {}),
    })

    return response
  } catch (error: any) {
    console.error('Registration error:', error)

    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
  }
}

