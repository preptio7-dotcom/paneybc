export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createAdminAuditLog } from '@/lib/admin-audit'
import {
  extractRegistrationSettings,
  isValidStudentRole,
  normalizePkPhone,
  sanitizeText,
} from '@/lib/account-utils'

function requireAdmin(request: NextRequest) {
  const user = getCurrentUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null
  }
  return user
}

function userAuditSnapshot(user: {
  id: string
  email: string
  role: string
  studentRole: string | null
  isBanned: boolean
  name: string
  degree: string
  level: string
  institute: string | null
  city: string | null
  studentId: string | null
  phone: string | null
  instituteRating: number | null
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    studentRole: user.studentRole,
    isBanned: user.isBanned,
    name: user.name,
    degree: user.degree,
    level: user.level,
    institute: user.institute,
    city: user.city,
    studentId: user.studentId,
    phone: user.phone,
    instituteRating: user.instituteRating,
  }
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
    const studentRole = (searchParams.get('studentRole') || '').trim()
    const status = (searchParams.get('status') || '').trim()
    const pageParam = Number(searchParams.get('page') || '1')
    const pageSizeParam = Number(searchParams.get('pageSize') || '5')
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
    const pageSize =
      Number.isFinite(pageSizeParam) && pageSizeParam > 0
        ? Math.min(Math.floor(pageSizeParam), 50)
        : 5

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
    if (studentRole && !['user', 'ambassador', 'paid', 'unpaid', 'all'].includes(studentRole)) {
      return NextResponse.json({ error: 'Invalid student role filter' }, { status: 400 })
    }
    if (studentRole && studentRole !== 'all') {
      where.studentRole = studentRole
    }
    if (status === 'banned') {
      where.isBanned = true
    }
    if (status === 'active') {
      where.isBanned = false
    }

    const total = await prisma.user.count({ where })
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentRole: true,
        degree: true,
        level: true,
        institute: true,
        city: true,
        studentId: true,
        phone: true,
        instituteRating: true,
        isBanned: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ users, total, currentPage: safePage, pageSize, totalPages })
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
    const hasBanToggle = Object.prototype.hasOwnProperty.call(body, 'isBanned')
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

    const updateData: Record<string, any> = {}
    if (hasBanToggle) {
      updateData.isBanned = isBanned
    }

    const wantsProfileUpdate =
      [
        'name',
        'degree',
        'level',
        'institute',
        'city',
        'studentId',
        'phone',
        'instituteRating',
        'studentRole',
      ].some((key) => Object.prototype.hasOwnProperty.call(body, key))

    if (wantsProfileUpdate) {
      const normalizedName = sanitizeText(body.name || target.name || '', 100)
      const normalizedDegree = sanitizeText(body.degree || target.degree || '', 40)
      const normalizedLevel = sanitizeText(body.level || target.level || '', 40)
      const normalizedInstitute = sanitizeText(body.institute || target.institute || '', 120)
      const normalizedCity = sanitizeText(body.city || target.city || '', 80)
      const normalizedStudentId = sanitizeText(body.studentId || target.studentId || '', 60)
      const normalizedPhone = normalizePkPhone(body.phone || target.phone || '')
      const rating = Number(body.instituteRating ?? target.instituteRating)

      if (!normalizedName || !normalizedDegree || !normalizedLevel || !normalizedInstitute || !normalizedCity || !normalizedStudentId || !normalizedPhone) {
        return NextResponse.json({ error: 'All profile fields are required' }, { status: 400 })
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Institute rating must be between 1 and 5' }, { status: 400 })
      }
      const nextStudentRole = body.studentRole ?? target.studentRole
      if (!isValidStudentRole(nextStudentRole)) {
        return NextResponse.json({ error: 'Invalid student role' }, { status: 400 })
      }

      const settings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
      const registrationSettings = extractRegistrationSettings(settings?.testSettings || {})
      if (!registrationSettings.degrees.includes(normalizedDegree)) {
        return NextResponse.json({ error: 'Selected degree is no longer available' }, { status: 400 })
      }
      if (!registrationSettings.levels.includes(normalizedLevel)) {
        return NextResponse.json({ error: 'Selected level is no longer available' }, { status: 400 })
      }

      const duplicate = await prisma.user.findFirst({
        where: {
          id: { not: userId },
          OR: [{ phone: normalizedPhone }, { studentId: normalizedStudentId }],
        },
        select: { phone: true, studentId: true },
      })
      if (duplicate) {
        if (duplicate.phone === normalizedPhone) {
          return NextResponse.json({ error: 'Phone number is already in use' }, { status: 409 })
        }
        if (duplicate.studentId === normalizedStudentId) {
          return NextResponse.json({ error: 'Student ID is already in use' }, { status: 409 })
        }
      }

      updateData.name = normalizedName
      updateData.degree = normalizedDegree
      updateData.level = normalizedLevel
      updateData.institute = normalizedInstitute
      updateData.city = normalizedCity
      updateData.studentId = normalizedStudentId
      updateData.phone = normalizedPhone
      updateData.instituteRating = rating
      updateData.studentRole = nextStudentRole
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentRole: true,
        degree: true,
        level: true,
        institute: true,
        city: true,
        studentId: true,
        phone: true,
        instituteRating: true,
        isBanned: true,
      },
    })

    await createAdminAuditLog({
      request,
      actor: admin,
      action: hasBanToggle && !wantsProfileUpdate ? 'USER_BAN_STATUS_UPDATED' : 'USER_PROFILE_UPDATED',
      targetType: 'user',
      targetId: userId,
      before: userAuditSnapshot(target as any),
      after: userAuditSnapshot(updated as any),
      metadata: {
        hasBanToggle,
        wantsProfileUpdate,
        updatedKeys: Object.keys(updateData),
      },
    })

    // Auto-assign referral code when a user is promoted to ambassador
    if (updated.studentRole === 'ambassador') {
      try {
        const freshUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { referralCode: true, name: true, email: true },
        })
        if (freshUser && !freshUser.referralCode) {
          const { assignReferralToAmbassador } = await import('@/lib/referral')
          await assignReferralToAmbassador(userId, freshUser.name || freshUser.email)
        }
      } catch (referralError) {
        console.error('[Referral] Failed to assign referral code:', referralError)
        // Do not block the ambassador assignment — role is already saved
      }
    }

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

    const before = userAuditSnapshot(target as any)
    await prisma.user.delete({ where: { id: userId } })

    await createAdminAuditLog({
      request,
      actor: admin,
      action: 'USER_DELETED',
      targetType: 'user',
      targetId: userId,
      before,
      after: null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin user delete error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
