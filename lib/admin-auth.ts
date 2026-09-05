import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { getCurrentUser } from '@/lib/auth'
import { getJwtSecret } from '@/lib/jwt-secret'
import { prisma } from '@/lib/prisma'

export function requireAdminUser(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return null
  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return null
  return currentUser
}

export async function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('super_admin_session')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id?: string; role?: string }
    if (!decoded.id || decoded.role !== 'super_admin') return null

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isBanned: true },
    })
    if (!user || user.role !== 'super_admin' || user.isBanned) return null

    return decoded
  } catch {
    return null
  }
}
