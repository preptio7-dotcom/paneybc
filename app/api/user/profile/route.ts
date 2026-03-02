export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { extractRegistrationSettings, normalizePkPhone, sanitizeText } from '@/lib/account-utils'
import {
  LEGACY_AVATAR_PACK_ID,
  getLegacyAvatarSeedFromPath,
  isLegacyAvatarSeed,
  isLegacySeedAvatarId,
  normalizeAvatarSeeds,
  packAvatarId,
  parsePackedAvatarId,
} from '@/lib/avatar'
import { getActiveAvatarPack, resolveAvatarForUser } from '@/lib/avatar-pack-service'

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  avatarId: true,
  role: true,
  studentRole: true,
  degree: true,
  level: true,
  institute: true,
  city: true,
  studentId: true,
  phone: true,
  instituteRating: true,
  examName: true,
  examDate: true,
  dailyQuestionGoal: true,
  prepChecklist: true,
  practiceStreakCurrent: true,
  practiceStreakBest: true,
  practiceStreakLastDate: true,
  badges: {
    select: {
      badgeType: true,
      earnedAt: true,
      seen: true,
    },
    orderBy: { earnedAt: 'asc' as const },
  },
  createdAt: true,
}

async function formatProfileResponse(user: any) {
  const resolvedAvatar = await resolveAvatarForUser(user)
  return {
    ...user,
    avatarId: resolvedAvatar.avatarId,
    avatarSeed: resolvedAvatar.avatarSeed,
    avatarPackId: resolvedAvatar.avatarPackId,
    avatar: resolvedAvatar.avatar,
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: PROFILE_SELECT,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: await formatProfileResponse(user) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { examName, examDate, dailyQuestionGoal, prepChecklist } = body

    const updateData: Record<string, any> = {}

    if (Object.prototype.hasOwnProperty.call(body, 'avatarId')) {
      const activePack = await getActiveAvatarPack()
      const activeSeeds = normalizeAvatarSeeds(activePack.seeds, activePack.variantsCount)
      const providedAvatarId = String(body.avatarId || '').trim()
      const packedAvatarId = parsePackedAvatarId(providedAvatarId)

      if (packedAvatarId) {
        if (packedAvatarId.packId === LEGACY_AVATAR_PACK_ID) {
          if (!isLegacyAvatarSeed(packedAvatarId.seed)) {
            return NextResponse.json({ error: 'Selected avatar is not part of this pack' }, { status: 400 })
          }
          updateData.avatarId = packAvatarId(LEGACY_AVATAR_PACK_ID, packedAvatarId.seed)
        } else {
          const targetPack = await prisma.avatarPack.findUnique({ where: { id: packedAvatarId.packId } })
          if (!targetPack) {
            return NextResponse.json({ error: 'Selected avatar pack does not exist' }, { status: 400 })
          }
          if (!targetPack.isActive) {
            return NextResponse.json({ error: 'Selected avatar pack is currently unavailable' }, { status: 400 })
          }
          const allowedSeeds = normalizeAvatarSeeds(targetPack.seeds, targetPack.variantsCount)
          if (!allowedSeeds.includes(packedAvatarId.seed)) {
            return NextResponse.json({ error: 'Selected avatar is not part of this pack' }, { status: 400 })
          }
          updateData.avatarId = packAvatarId(targetPack.id, packedAvatarId.seed)
        }
      } else if (isLegacySeedAvatarId(providedAvatarId) && activeSeeds.includes(providedAvatarId)) {
        updateData.avatarId = packAvatarId(activePack.id, providedAvatarId)
      } else {
        return NextResponse.json({ error: 'Invalid avatar selected' }, { status: 400 })
      }
    }

    if (
      !Object.prototype.hasOwnProperty.call(body, 'avatarId') &&
      typeof body.avatar === 'string' &&
      body.avatar.trim()
    ) {
      const legacySeed = getLegacyAvatarSeedFromPath(body.avatar)
      if (legacySeed) {
        if (isLegacyAvatarSeed(legacySeed)) {
          updateData.avatarId = packAvatarId(LEGACY_AVATAR_PACK_ID, legacySeed)
        } else {
          const activePack = await getActiveAvatarPack()
          const activeSeeds = normalizeAvatarSeeds(activePack.seeds, activePack.variantsCount)
          if (activeSeeds.includes(legacySeed)) {
            updateData.avatarId = packAvatarId(activePack.id, legacySeed)
          }
        }
      }
    }

    if (typeof examName === 'string') updateData.examName = examName
    if (examDate) {
      const parsed = new Date(examDate)
      if (!Number.isNaN(parsed.getTime())) {
        updateData.examDate = parsed
      }
    }
    if (typeof dailyQuestionGoal === 'number') updateData.dailyQuestionGoal = dailyQuestionGoal
    if (Array.isArray(prepChecklist)) {
      updateData.prepChecklist = prepChecklist
        .map((item: any) => ({
          label: String(item.label || '').trim(),
          done: Boolean(item.done),
        }))
        .filter((item: any) => item.label)
    }

    const profileUpdateKeys = ['name', 'degree', 'level', 'institute', 'city', 'studentId', 'phone', 'instituteRating']
    const wantsProfileUpdate = profileUpdateKeys.some((key) => Object.prototype.hasOwnProperty.call(body, key))

    if (wantsProfileUpdate) {
      const existingProfile = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: {
          role: true,
          name: true,
          degree: true,
          level: true,
          institute: true,
          city: true,
          studentId: true,
          phone: true,
          instituteRating: true,
        },
      })

      if (!existingProfile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const isStudentProfile = existingProfile.role === 'student'

      const normalizedName = sanitizeText(
        Object.prototype.hasOwnProperty.call(body, 'name') ? body.name : existingProfile.name || '',
        100
      )
      const normalizedDegree = sanitizeText(
        Object.prototype.hasOwnProperty.call(body, 'degree') ? body.degree : existingProfile.degree || '',
        40
      )
      const normalizedLevel = sanitizeText(
        Object.prototype.hasOwnProperty.call(body, 'level') ? body.level : existingProfile.level || '',
        40
      )
      const normalizedInstitute = sanitizeText(
        Object.prototype.hasOwnProperty.call(body, 'institute') ? body.institute : existingProfile.institute || '',
        120
      )
      const normalizedCity = sanitizeText(
        Object.prototype.hasOwnProperty.call(body, 'city') ? body.city : existingProfile.city || '',
        80
      )
      const normalizedStudentId = sanitizeText(
        Object.prototype.hasOwnProperty.call(body, 'studentId') ? body.studentId : existingProfile.studentId || '',
        60
      )
      const normalizedPhone = normalizePkPhone(
        Object.prototype.hasOwnProperty.call(body, 'phone') ? body.phone : existingProfile.phone || ''
      )
      const rating = Number(
        Object.prototype.hasOwnProperty.call(body, 'instituteRating')
          ? body.instituteRating
          : existingProfile.instituteRating
      )

      if (
        !normalizedName ||
        !normalizedDegree ||
        !normalizedLevel ||
        !normalizedCity ||
        !normalizedStudentId
      ) {
        return NextResponse.json({ error: 'Please complete all required profile fields' }, { status: 400 })
      }

      if (isStudentProfile) {
        if (!normalizedInstitute || !normalizedPhone) {
          return NextResponse.json({ error: 'Please complete all required profile fields' }, { status: 400 })
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return NextResponse.json({ error: 'Institute rating must be between 1 and 5' }, { status: 400 })
        }
      }

      const settings = await prisma.systemSettings.findFirst({ select: { testSettings: true } })
      const registrationSettings = extractRegistrationSettings(settings?.testSettings || {})
      if (!registrationSettings.degrees.includes(normalizedDegree)) {
        return NextResponse.json({ error: 'Selected degree is no longer available' }, { status: 400 })
      }
      if (!registrationSettings.levels.includes(normalizedLevel)) {
        return NextResponse.json({ error: 'Selected level is no longer available' }, { status: 400 })
      }

      const duplicateWhereClauses: Array<{ phone?: string; studentId?: string }> = []
      if (normalizedStudentId) {
        duplicateWhereClauses.push({ studentId: normalizedStudentId })
      }
      if (isStudentProfile && normalizedPhone) {
        duplicateWhereClauses.push({ phone: normalizedPhone })
      }

      const duplicate = duplicateWhereClauses.length
        ? await prisma.user.findFirst({
            where: {
              id: { not: currentUser.userId },
              OR: duplicateWhereClauses,
            },
            select: { phone: true, studentId: true },
          })
        : null

      if (duplicate) {
        if (isStudentProfile && normalizedPhone && duplicate.phone === normalizedPhone) {
          return NextResponse.json({ error: 'Phone number is already in use' }, { status: 409 })
        }
        if (duplicate.studentId === normalizedStudentId) {
          return NextResponse.json({ error: 'Student ID is already in use' }, { status: 409 })
        }
      }

      updateData.name = normalizedName
      updateData.degree = normalizedDegree
      updateData.level = normalizedLevel
      updateData.city = normalizedCity
      updateData.studentId = normalizedStudentId
      if (isStudentProfile) {
        updateData.institute = normalizedInstitute
        updateData.phone = normalizedPhone
        updateData.instituteRating = rating
      }
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: currentUser.userId },
      data: updateData,
      select: PROFILE_SELECT,
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: await formatProfileResponse(user),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
