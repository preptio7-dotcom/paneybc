import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { extractBetaFeatureSettings } from '@/lib/beta-features'
import type { BlogViewer } from '@/lib/blog-visibility'

export async function resolveServerBlogViewer(): Promise<BlogViewer | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded) return null

  if (decoded.role === 'admin' || decoded.role === 'super_admin') {
    return { role: decoded.role, studentRole: null }
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { studentRole: true },
  })

  return {
    role: decoded.role,
    studentRole: user?.studentRole || null,
  }
}

export async function resolveBlogFeatureVisibility() {
  const settings = await prisma.systemSettings.findFirst({
    select: { testSettings: true },
  })
  const savedTestSettings =
    settings?.testSettings &&
    typeof settings.testSettings === 'object' &&
    !Array.isArray(settings.testSettings)
      ? (settings.testSettings as Record<string, unknown>)
      : {}
  const betaFeatures = extractBetaFeatureSettings(savedTestSettings)
  return betaFeatures.blog
}

