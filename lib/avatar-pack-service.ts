import type { AvatarPack, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_DICEBEAR_STYLE,
  LEGACY_AVATAR_PACK_ID,
  LEGACY_AVATAR_SEEDS,
  LEGACY_AVATAR_STYLE,
  PREDEFINED_AVATAR_SEEDS,
  buildAvatarUrl,
  getDeterministicSeedFromPool,
  getLegacyAvatarSeedFromPath,
  isLegacyAvatarSeed,
  isLegacySeedAvatarId,
  normalizeAvatarSeeds,
  packAvatarId,
  parsePackedAvatarId,
  type AvatarPackSummary,
  type ResolvedAvatar,
} from '@/lib/avatar'

type AvatarUserInput = {
  id?: string | null
  name?: string | null
  avatarId?: string | null
  avatar?: string | null
}

const DEFAULT_PACK_NAME = 'Default Pack'

function ensurePackSeeds(pack: { seeds: Prisma.JsonValue; variantsCount: number }) {
  return normalizeAvatarSeeds(pack.seeds, pack.variantsCount)
}

function getLegacyAvatarPackSummary(): AvatarPackSummary {
  return {
    id: LEGACY_AVATAR_PACK_ID,
    name: 'Classic Pack',
    dicebearStyle: LEGACY_AVATAR_STYLE,
    variantsCount: LEGACY_AVATAR_SEEDS.length,
    seeds: [...LEGACY_AVATAR_SEEDS],
    isActive: false,
  }
}

function toAvatarPackSummary(pack: AvatarPack): AvatarPackSummary {
  return {
    id: pack.id,
    name: pack.name,
    dicebearStyle: pack.dicebearStyle || DEFAULT_DICEBEAR_STYLE,
    variantsCount: pack.variantsCount,
    seeds: ensurePackSeeds(pack),
    isActive: pack.isActive,
  }
}

async function ensureSystemSettings() {
  let settings = await prisma.systemSettings.findFirst({
    select: {
      id: true,
      activeAvatarPackId: true,
    },
  })

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {},
      select: {
        id: true,
        activeAvatarPackId: true,
      },
    })
  }

  return settings
}

export async function ensureActiveAvatarPack() {
  const settings = await ensureSystemSettings()

  let activePack: AvatarPack | null = null
  if (settings.activeAvatarPackId) {
    activePack = await prisma.avatarPack.findUnique({
      where: { id: settings.activeAvatarPackId },
    })
  }

  if (!activePack) {
    activePack = await prisma.avatarPack.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!activePack) {
    activePack = await prisma.avatarPack.create({
      data: {
        name: DEFAULT_PACK_NAME,
        dicebearStyle: DEFAULT_DICEBEAR_STYLE,
        variantsCount: PREDEFINED_AVATAR_SEEDS.length,
        seeds: [...PREDEFINED_AVATAR_SEEDS],
        isActive: true,
      },
    })
  }

  if (!activePack.isActive) {
    await prisma.avatarPack.update({
      where: { id: activePack.id },
      data: { isActive: true },
    })
  }

  await prisma.avatarPack.updateMany({
    where: {
      id: { not: activePack.id },
      isActive: true,
    },
    data: { isActive: false },
  })

  if (settings.activeAvatarPackId !== activePack.id) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { activeAvatarPackId: activePack.id },
    })
  }

  return toAvatarPackSummary(activePack)
}

export async function getActiveAvatarPack() {
  return ensureActiveAvatarPack()
}

function resolveAvatarAgainstPacks(
  user: AvatarUserInput,
  activePack: AvatarPackSummary,
  packMap: Map<string, AvatarPackSummary>
): ResolvedAvatar {
  const packed = parsePackedAvatarId(user.avatarId)
  if (packed) {
    const sourcePack = packMap.get(packed.packId)
    if (sourcePack && sourcePack.seeds.includes(packed.seed)) {
      return {
        avatarId: user.avatarId || packAvatarId(sourcePack.id, packed.seed),
        avatarPackId: sourcePack.id,
        avatarSeed: packed.seed,
        avatar: buildAvatarUrl(sourcePack.dicebearStyle, packed.seed),
      }
    }
  }

  const legacySeed = isLegacySeedAvatarId(user.avatarId)
    ? String(user.avatarId)
    : getLegacyAvatarSeedFromPath(user.avatar)

  if (isLegacyAvatarSeed(legacySeed)) {
    return {
      avatarId: packAvatarId(LEGACY_AVATAR_PACK_ID, legacySeed),
      avatarPackId: LEGACY_AVATAR_PACK_ID,
      avatarSeed: legacySeed,
      avatar: buildAvatarUrl(LEGACY_AVATAR_STYLE, legacySeed),
    }
  }

  const nextSeed =
    legacySeed && activePack.seeds.includes(legacySeed)
      ? legacySeed
      : getDeterministicSeedFromPool(user.id || user.name || 'Preptio', activePack.seeds)

  return {
    avatarId: packAvatarId(activePack.id, nextSeed),
    avatarPackId: activePack.id,
    avatarSeed: nextSeed,
    avatar: buildAvatarUrl(activePack.dicebearStyle, nextSeed),
  }
}

export async function resolveAvatarForUser(user: AvatarUserInput) {
  const activePack = await getActiveAvatarPack()
  const packed = parsePackedAvatarId(user.avatarId)
  const legacyPack = getLegacyAvatarPackSummary()

  let packMap = new Map<string, AvatarPackSummary>([
    [activePack.id, activePack],
    [legacyPack.id, legacyPack],
  ])
  if (packed && packed.packId !== activePack.id && packed.packId !== LEGACY_AVATAR_PACK_ID) {
    const linkedPack = await prisma.avatarPack.findUnique({ where: { id: packed.packId } })
    if (linkedPack) {
      packMap = new Map([
        [activePack.id, activePack],
        [legacyPack.id, legacyPack],
        [linkedPack.id, toAvatarPackSummary(linkedPack)],
      ])
    }
  }

  return resolveAvatarAgainstPacks(user, activePack, packMap)
}

export async function resolveAvatarsForUsers<T extends AvatarUserInput>(users: T[]) {
  if (!users.length) return []
  const activePack = await getActiveAvatarPack()
  const legacyPack = getLegacyAvatarPackSummary()
  const packedIds = Array.from(
    new Set(
      users
        .map((user) => parsePackedAvatarId(user.avatarId)?.packId || null)
        .filter(
          (value): value is string =>
            Boolean(value) && value !== activePack.id && value !== LEGACY_AVATAR_PACK_ID
        )
    )
  )

  const packRows = packedIds.length
    ? await prisma.avatarPack.findMany({
        where: { id: { in: packedIds } },
      })
    : []

  const packMap = new Map<string, AvatarPackSummary>([
    [activePack.id, activePack],
    [legacyPack.id, legacyPack],
  ])
  for (const row of packRows) {
    packMap.set(row.id, toAvatarPackSummary(row))
  }

  return users.map((user) => resolveAvatarAgainstPacks(user, activePack, packMap))
}

export async function listAvatarPacks() {
  const activePack = await ensureActiveAvatarPack()
  const settings = await ensureSystemSettings()
  const packs = await prisma.avatarPack.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  })

  return {
    activeAvatarPackId: settings.activeAvatarPackId || activePack.id,
    packs: packs.map((pack) => {
      const summary = toAvatarPackSummary(pack)
      const previewSeeds = summary.seeds.slice(0, 5)
      return {
        ...summary,
        createdAt: pack.createdAt,
        updatedAt: pack.updatedAt,
        previews: previewSeeds.map((seed) => ({
          seed,
          avatarId: packAvatarId(summary.id, seed),
          url: buildAvatarUrl(summary.dicebearStyle, seed),
        })),
      }
    }),
  }
}

export async function createAvatarPack(params: {
  name: string
  dicebearStyle: string
  variantsCount: number
  seeds?: string[]
  createdBy?: string | null
  setAsActive?: boolean
}) {
  const name = String(params.name || '').trim()
  const dicebearStyle = String(params.dicebearStyle || DEFAULT_DICEBEAR_STYLE).trim() || DEFAULT_DICEBEAR_STYLE
  const variantsCount = Math.min(50, Math.max(5, Number(params.variantsCount) || PREDEFINED_AVATAR_SEEDS.length))
  if (!name) {
    throw new Error('Pack name is required')
  }

  const seeds = normalizeAvatarSeeds(params.seeds || [], variantsCount)
  const pack = await prisma.avatarPack.create({
    data: {
      name,
      dicebearStyle,
      variantsCount: seeds.length,
      seeds,
      isActive: Boolean(params.setAsActive),
      createdBy: params.createdBy || null,
    },
  })

  if (params.setAsActive) {
    await setActiveAvatarPack(pack.id)
  } else {
    await ensureActiveAvatarPack()
  }

  return toAvatarPackSummary(pack)
}

export async function setActiveAvatarPack(packId: string) {
  const pack = await prisma.avatarPack.findUnique({ where: { id: packId } })
  if (!pack) {
    throw new Error('Avatar pack not found')
  }

  const settings = await ensureSystemSettings()
  await prisma.$transaction([
    prisma.avatarPack.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.avatarPack.update({
      where: { id: pack.id },
      data: { isActive: true },
    }),
    prisma.systemSettings.update({
      where: { id: settings.id },
      data: { activeAvatarPackId: pack.id },
    }),
  ])

  return toAvatarPackSummary(pack)
}

export async function updateAvatarPack(
  packId: string,
  params: {
    name?: string
    dicebearStyle?: string
    variantsCount?: number
    seeds?: string[]
    isActive?: boolean
  }
) {
  const existing = await prisma.avatarPack.findUnique({ where: { id: packId } })
  if (!existing) {
    throw new Error('Avatar pack not found')
  }

  const variantsCount = Math.min(
    50,
    Math.max(5, Number(params.variantsCount) || existing.variantsCount || PREDEFINED_AVATAR_SEEDS.length)
  )
  const seeds = normalizeAvatarSeeds(
    params.seeds ?? ensurePackSeeds(existing),
    variantsCount
  )
  const updated = await prisma.avatarPack.update({
    where: { id: existing.id },
    data: {
      ...(typeof params.name === 'string' ? { name: params.name.trim() || existing.name } : {}),
      ...(typeof params.dicebearStyle === 'string'
        ? { dicebearStyle: params.dicebearStyle.trim() || existing.dicebearStyle }
        : {}),
      variantsCount: seeds.length,
      seeds,
      ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
    },
  })

  if (params.isActive === true) {
    await setActiveAvatarPack(updated.id)
  } else if (updated.isActive) {
    await ensureActiveAvatarPack()
  }

  return toAvatarPackSummary(updated)
}

export async function toggleAvatarPackStatus(packId: string, isActive: boolean) {
  if (isActive) {
    return setActiveAvatarPack(packId)
  }

  const pack = await prisma.avatarPack.findUnique({ where: { id: packId } })
  if (!pack) throw new Error('Avatar pack not found')
  if (pack.isActive) {
    const replacement = await prisma.avatarPack.findFirst({
      where: { id: { not: pack.id } },
      orderBy: { createdAt: 'asc' },
    })
    if (!replacement) {
      throw new Error('At least one active avatar pack is required. Create another pack first.')
    }
    await setActiveAvatarPack(replacement.id)
    const refreshedPack = await prisma.avatarPack.findUnique({ where: { id: pack.id } })
    if (!refreshedPack) {
      throw new Error('Avatar pack not found after deactivation')
    }
    return toAvatarPackSummary(refreshedPack)
  }

  const updated = await prisma.avatarPack.update({
    where: { id: pack.id },
    data: { isActive: false },
  })
  return toAvatarPackSummary(updated)
}
