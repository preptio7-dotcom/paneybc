import type { AvatarPack, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_DICEBEAR_STYLE,
  LEGACY_AVATAR_PACK_ID,
  LEGACY_AVATAR_SEEDS,
  LEGACY_AVATAR_STYLE,
  MULTIAVATAR_PRESET_SEEDS,
  PREDEFINED_AVATAR_SEEDS,
  PUBLIC_AVATAR_SOURCES,
  buildAvatarUrl,
  getDeterministicSeedFromPool,
  getLegacyAvatarSeedFromPath,
  isLegacyAvatarSeed,
  isLegacySeedAvatarId,
  normalizeAvatarSeeds,
  normalizeAvatarSource,
  packAvatarId,
  parsePackedAvatarId,
  type AvatarPackSummary,
  type AvatarSource,
  type ResolvedAvatar,
} from '@/lib/avatar'

type AvatarUserInput = {
  id?: string | null
  name?: string | null
  avatarId?: string | null
  avatar?: string | null
}

const DEFAULT_PACK_NAME = 'Default Pack'
const SYSTEM_CREATED_BY = 'system-avatar-pack'

const SYSTEM_PACK_PRESETS: Array<{
  name: string
  source: AvatarSource
  dicebearStyle: string
  seeds: string[]
  variantsCount: number
  isActive: boolean
}> = [
    {
      name: 'Multiavatar 3D Pack',
      source: 'multiavatar',
      dicebearStyle: DEFAULT_DICEBEAR_STYLE,
      seeds: [...MULTIAVATAR_PRESET_SEEDS],
      variantsCount: MULTIAVATAR_PRESET_SEEDS.length,
      isActive: true,
    },
  ]

function normalizePackSource(value: unknown): AvatarSource {
  const source = normalizeAvatarSource(value)
  return source === 'legacy' ? 'dicebear' : source
}

function getDefaultSeedsForSource(source: AvatarSource) {
  if (source === 'multiavatar') {
    return [...MULTIAVATAR_PRESET_SEEDS]
  }
  return [...PREDEFINED_AVATAR_SEEDS]
}

function normalizePackSeeds(rawSeeds: unknown, variantsCount: number, source: AvatarSource) {
  const sourceDefaults = getDefaultSeedsForSource(source)
  const sourceSeeds = Array.isArray(rawSeeds)
    ? rawSeeds.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  const seedsToNormalize = sourceSeeds.length ? sourceSeeds : sourceDefaults
  return normalizeAvatarSeeds(seedsToNormalize, variantsCount)
}

function ensurePackSeeds(pack: {
  source?: string
  seeds: Prisma.JsonValue
  variantsCount: number
}) {
  const source = normalizePackSource(pack.source || 'dicebear')
  return normalizePackSeeds(pack.seeds, pack.variantsCount, source)
}

function getLegacyAvatarPackSummary(): AvatarPackSummary {
  return {
    id: LEGACY_AVATAR_PACK_ID,
    name: 'Classic Pack',
    source: 'legacy',
    dicebearStyle: LEGACY_AVATAR_STYLE,
    variantsCount: LEGACY_AVATAR_SEEDS.length,
    seeds: [...LEGACY_AVATAR_SEEDS],
    isActive: true,
  }
}

function toAvatarPackSummary(pack: AvatarPack): AvatarPackSummary {
  const source = normalizePackSource((pack as AvatarPack & { source?: string }).source || 'dicebear')
  return {
    id: pack.id,
    name: pack.name,
    source,
    dicebearStyle: pack.dicebearStyle || DEFAULT_DICEBEAR_STYLE,
    variantsCount: pack.variantsCount,
    seeds: ensurePackSeeds({ source, seeds: pack.seeds, variantsCount: pack.variantsCount }),
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

async function ensurePresetAvatarPacks() {
  for (const preset of SYSTEM_PACK_PRESETS) {
    const existing = await prisma.avatarPack.findFirst({
      where: {
        name: preset.name,
        source: preset.source,
      },
      select: {
        id: true,
        createdBy: true,
        source: true,
        dicebearStyle: true,
        variantsCount: true,
        seeds: true,
        isActive: true,
      },
    })

    if (!existing) {
      const seeds = normalizePackSeeds(preset.seeds, preset.variantsCount, preset.source)
      await prisma.avatarPack.create({
        data: {
          name: preset.name,
          source: preset.source,
          dicebearStyle: preset.dicebearStyle,
          variantsCount: seeds.length,
          seeds,
          isActive: preset.isActive,
          createdBy: SYSTEM_CREATED_BY,
        },
      })
    } else if (existing.createdBy === SYSTEM_CREATED_BY) {
      const normalizedPresetSeeds = normalizePackSeeds(preset.seeds, preset.variantsCount, preset.source)
      const normalizedExistingSeeds = ensurePackSeeds({
        source: existing.source,
        seeds: existing.seeds,
        variantsCount: existing.variantsCount,
      })
      const shouldUpdate =
        existing.source !== preset.source ||
        existing.dicebearStyle !== preset.dicebearStyle ||
        existing.variantsCount !== normalizedPresetSeeds.length ||
        existing.isActive !== preset.isActive ||
        JSON.stringify(normalizedExistingSeeds) !== JSON.stringify(normalizedPresetSeeds)

      if (shouldUpdate) {
        await prisma.avatarPack.update({
          where: { id: existing.id },
          data: {
            source: preset.source,
            dicebearStyle: preset.dicebearStyle,
            variantsCount: normalizedPresetSeeds.length,
            seeds: normalizedPresetSeeds,
            isActive: preset.isActive,
          },
        })
      }
    }
  }
}

async function ensureBaseDefaultPack() {
  const hasAnyPack = await prisma.avatarPack.findFirst({ select: { id: true } })
  if (hasAnyPack) return

  const seeds = normalizePackSeeds(PREDEFINED_AVATAR_SEEDS, PREDEFINED_AVATAR_SEEDS.length, 'dicebear')
  await prisma.avatarPack.create({
    data: {
      name: DEFAULT_PACK_NAME,
      source: 'dicebear',
      dicebearStyle: DEFAULT_DICEBEAR_STYLE,
      variantsCount: seeds.length,
      seeds,
      isActive: true,
      createdBy: SYSTEM_CREATED_BY,
    },
  })
}

export async function ensureActiveAvatarPack() {
  await ensureBaseDefaultPack()
  await ensurePresetAvatarPacks()
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
    activePack = await prisma.avatarPack.findFirst({
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!activePack) {
    throw new Error('Unable to initialize avatar packs')
  }

  if (!activePack.isActive) {
    await prisma.avatarPack.update({
      where: { id: activePack.id },
      data: { isActive: true },
    })
    activePack = await prisma.avatarPack.findUnique({ where: { id: activePack.id } })
  }

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

export async function getActiveAvatarPacks() {
  const defaultPack = await ensureActiveAvatarPack()
  const packs = await prisma.avatarPack.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const summaries = packs.map(toAvatarPackSummary)
  if (!summaries.find((pack) => pack.id === defaultPack.id)) {
    summaries.unshift(defaultPack)
  }
  return summaries
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
        avatar: buildAvatarUrl(sourcePack.dicebearStyle, packed.seed, sourcePack.source),
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
      avatar: buildAvatarUrl(LEGACY_AVATAR_STYLE, legacySeed, 'legacy'),
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
    avatar: buildAvatarUrl(activePack.dicebearStyle, nextSeed, activePack.source),
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
  const defaultPack = await ensureActiveAvatarPack()
  const settings = await ensureSystemSettings()
  const packs = await prisma.avatarPack.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  })

  const activeAvatarPackId = settings.activeAvatarPackId || defaultPack.id
  return {
    activeAvatarPackId,
    packs: packs.map((pack) => {
      const summary = toAvatarPackSummary(pack)
      const previewSeeds = summary.seeds.slice(0, 5)
      return {
        ...summary,
        isDefault: summary.id === activeAvatarPackId,
        createdAt: pack.createdAt,
        updatedAt: pack.updatedAt,
        previews: previewSeeds.map((seed) => ({
          seed,
          avatarId: packAvatarId(summary.id, seed),
          url: buildAvatarUrl(summary.dicebearStyle, seed, summary.source),
        })),
      }
    }),
  }
}

export async function createAvatarPack(params: {
  name: string
  source?: AvatarSource
  dicebearStyle?: string
  variantsCount: number
  seeds?: string[]
  createdBy?: string | null
  setAsActive?: boolean
}) {
  const name = String(params.name || '').trim()
  const source = normalizePackSource(params.source || 'dicebear')
  const dicebearStyle =
    String(params.dicebearStyle || DEFAULT_DICEBEAR_STYLE).trim() || DEFAULT_DICEBEAR_STYLE
  const variantsCount = Math.min(50, Math.max(5, Number(params.variantsCount) || PREDEFINED_AVATAR_SEEDS.length))
  if (!name) {
    throw new Error('Pack name is required')
  }
  if (!PUBLIC_AVATAR_SOURCES.includes(source as (typeof PUBLIC_AVATAR_SOURCES)[number])) {
    throw new Error('Invalid avatar source')
  }

  const seeds = normalizePackSeeds(params.seeds || [], variantsCount, source)
  const pack = await prisma.avatarPack.create({
    data: {
      name,
      source,
      dicebearStyle,
      variantsCount: seeds.length,
      seeds,
      isActive: true,
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
    prisma.avatarPack.update({
      where: { id: pack.id },
      data: { isActive: true },
    }),
    prisma.systemSettings.update({
      where: { id: settings.id },
      data: { activeAvatarPackId: pack.id },
    }),
  ])

  const updated = await prisma.avatarPack.findUnique({ where: { id: pack.id } })
  if (!updated) throw new Error('Avatar pack not found after activation')
  return toAvatarPackSummary(updated)
}

export async function updateAvatarPack(
  packId: string,
  params: {
    name?: string
    source?: AvatarSource
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

  const source = normalizePackSource(params.source ?? (existing as AvatarPack & { source?: string }).source)
  const variantsCount = Math.min(
    50,
    Math.max(5, Number(params.variantsCount) || existing.variantsCount || PREDEFINED_AVATAR_SEEDS.length)
  )
  const seeds = normalizePackSeeds(
    params.seeds ?? ensurePackSeeds(existing as AvatarPack & { source?: string }),
    variantsCount,
    source
  )
  const updated = await prisma.avatarPack.update({
    where: { id: existing.id },
    data: {
      ...(typeof params.name === 'string' ? { name: params.name.trim() || existing.name } : {}),
      source,
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
  } else if (params.isActive === false) {
    await toggleAvatarPackStatus(updated.id, false)
  } else {
    await ensureActiveAvatarPack()
  }

  const refreshed = await prisma.avatarPack.findUnique({ where: { id: updated.id } })
  if (!refreshed) throw new Error('Avatar pack not found after update')
  return toAvatarPackSummary(refreshed)
}

export async function toggleAvatarPackStatus(packId: string, isActive: boolean) {
  if (isActive) {
    const updated = await prisma.avatarPack.update({
      where: { id: packId },
      data: { isActive: true },
    })
    return toAvatarPackSummary(updated)
  }

  const pack = await prisma.avatarPack.findUnique({ where: { id: packId } })
  if (!pack) throw new Error('Avatar pack not found')

  const activeCount = await prisma.avatarPack.count({ where: { isActive: true } })
  if (pack.isActive && activeCount <= 1) {
    throw new Error('At least one active avatar pack is required.')
  }

  const settings = await ensureSystemSettings()
  if (settings.activeAvatarPackId === pack.id) {
    const replacement = await prisma.avatarPack.findFirst({
      where: {
        id: { not: pack.id },
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!replacement) {
      throw new Error('Set another pack as default before deactivating this one.')
    }

    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { activeAvatarPackId: replacement.id },
    })
  }

  const updated = await prisma.avatarPack.update({
    where: { id: pack.id },
    data: { isActive: false },
  })
  return toAvatarPackSummary(updated)
}
