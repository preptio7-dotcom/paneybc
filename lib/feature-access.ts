import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  canAccessBetaFeature,
  extractBetaFeatureSettings,
  type BetaFeatureKey,
  type BetaFeatureSettings,
} from '@/lib/beta-features'

export type FeatureUser = {
  id: string
  role: string
  studentRole: string | null
}

export type FeatureAccess = {
  user: FeatureUser
  betaFeatures: BetaFeatureSettings
  visibility: BetaFeatureSettings[BetaFeatureKey]
}

export async function resolveFeatureAccess(
  request: NextRequest,
  featureKey: BetaFeatureKey
): Promise<FeatureAccess | null> {
  const tokenUser = getCurrentUser(request)
  if (!tokenUser?.userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenUser.userId },
    select: { id: true, role: true, studentRole: true },
  })
  if (!user) {
    return null
  }

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
  const visibility = betaFeatures[featureKey]
  const isPrivileged = user.role === 'admin' || user.role === 'super_admin'
  const hasAccess = isPrivileged || canAccessBetaFeature(visibility, user.studentRole)
  if (!hasAccess) {
    return null
  }

  return {
    user: {
      id: user.id,
      role: user.role,
      studentRole: user.studentRole || null,
    },
    betaFeatures,
    visibility,
  }
}
