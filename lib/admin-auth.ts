import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export function requireAdminUser(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return null
  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') return null
  return currentUser
}
