export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  LEGACY_AVATAR_PACK_ID,
  LEGACY_AVATAR_SEEDS,
  LEGACY_AVATAR_STYLE,
  buildAvatarUrl,
  packAvatarId,
} from '@/lib/avatar'
import { getActiveAvatarPack, getActiveAvatarPacks } from '@/lib/avatar-pack-service'

export async function GET() {
  try {
    const defaultPack = await getActiveAvatarPack()
    const activePacks = await getActiveAvatarPacks()
    const packs = activePacks.map((pack) => ({
      id: pack.id,
      name: pack.name,
      source: pack.source,
      dicebearStyle: pack.dicebearStyle,
      variantsCount: pack.variantsCount,
      isActive: pack.isActive,
      isDefault: pack.id === defaultPack.id,
      options: pack.seeds.map((seed) => ({
        seed,
        avatarId: packAvatarId(pack.id, seed),
        url: buildAvatarUrl(pack.dicebearStyle, seed, pack.source),
      })),
    }))

    const legacyOptions = LEGACY_AVATAR_SEEDS.map((seed) => ({
      seed,
      avatarId: packAvatarId(LEGACY_AVATAR_PACK_ID, seed),
      url: buildAvatarUrl(LEGACY_AVATAR_STYLE, seed, 'legacy'),
    }))
    const legacyPack = {
      id: LEGACY_AVATAR_PACK_ID,
      name: 'Classic Pack',
      source: 'legacy',
      dicebearStyle: LEGACY_AVATAR_STYLE,
      variantsCount: legacyOptions.length,
      isActive: true,
      isDefault: false,
      options: legacyOptions,
    }

    const allPacks = [...packs, legacyPack]
    const options = allPacks.flatMap((pack) => pack.options)
    const defaultPackFromResponse = allPacks.find((pack) => pack.isDefault) || packs[0] || legacyPack

    return NextResponse.json(
      {
        pack: defaultPackFromResponse
          ? {
              id: defaultPackFromResponse.id,
              name: defaultPackFromResponse.name,
              source: defaultPackFromResponse.source,
              dicebearStyle: defaultPackFromResponse.dicebearStyle,
              variantsCount: defaultPackFromResponse.variantsCount,
              isActive: defaultPackFromResponse.isActive,
            }
          : null,
        packs: allPacks,
        options,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=600',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load avatar pack' }, { status: 500 })
  }
}
