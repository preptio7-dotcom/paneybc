export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123'

const getSuperAdmin = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('super_admin_session')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; role?: string }
    if (!decoded || decoded.role !== 'super_admin' || !decoded.id) return null
    return decoded
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const superAdmin = await getSuperAdmin()
    if (!superAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    const hash = await bcryptjs.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: 'admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    console.error('Super admin create admin error:', error)
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }
}
