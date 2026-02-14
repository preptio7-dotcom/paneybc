export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function requireAdmin(request: NextRequest) {
  const user = getCurrentUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null
  }
  return user
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim()
    const role = (searchParams.get('role') || '').trim()
    const status = (searchParams.get('status') || '').trim()

    const where: any = { role: 'student' }
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (role && role !== 'student') {
      return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 })
    }
    if (status === 'banned') {
      where.isBanned = true
    }
    if (status === 'active') {
      where.isBanned = false
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
    })

    const total = await prisma.user.count({ where: { role: 'student' } })

    return NextResponse.json({ users, total })
  } catch (error: any) {
    console.error('Admin users list error:', error)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const userId = String(body.userId || '').trim()
    const isBanned = Boolean(body.isBanned)

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    if (admin.userId === userId) {
      return NextResponse.json({ error: 'You cannot change your own status' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (admin.role === 'admin' && target.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      select: { id: true, name: true, email: true, role: true, isBanned: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error: any) {
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const userId = String(body.userId || '').trim()
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    if (admin.userId === userId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (admin.role === 'admin' && target.role !== 'student') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin user delete error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
