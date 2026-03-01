export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/admin-auth'
import {
  createAvatarPack,
  listAvatarPacks,
  setActiveAvatarPack,
  toggleAvatarPackStatus,
  updateAvatarPack,
} from '@/lib/avatar-pack-service'
import { normalizeAvatarSeeds } from '@/lib/avatar'

function parseSeedInput(input: unknown, variantsCount: number) {
  if (Array.isArray(input)) {
    return normalizeAvatarSeeds(input, variantsCount)
  }
  const raw = String(input || '').trim()
  if (!raw) return normalizeAvatarSeeds([], variantsCount)
  const split = raw.split(',').map((seed) => seed.trim())
  return normalizeAvatarSeeds(split, variantsCount)
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await listAvatarPacks()
    return NextResponse.json(payload)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load avatar packs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const variantsCount = Math.min(50, Math.max(5, Number(body.variantsCount) || 20))
    const seeds = parseSeedInput(body.seeds, variantsCount)
    const pack = await createAvatarPack({
      name: String(body.name || ''),
      dicebearStyle: String(body.dicebearStyle || 'avataaars'),
      variantsCount,
      seeds,
      createdBy: admin.userId,
      setAsActive: Boolean(body.setAsActive),
    })

    return NextResponse.json({ success: true, pack })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create avatar pack' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const packId = String(body.packId || '').trim()
    if (!packId) {
      return NextResponse.json({ error: 'packId is required' }, { status: 400 })
    }

    const action = String(body.action || '').trim()
    if (action === 'activate') {
      const pack = await setActiveAvatarPack(packId)
      return NextResponse.json({ success: true, pack })
    }

    if (action === 'deactivate') {
      const pack = await toggleAvatarPackStatus(packId, false)
      return NextResponse.json({ success: true, pack })
    }

    if (action === 'edit') {
      const variantsCount = Math.min(50, Math.max(5, Number(body.variantsCount) || 20))
      const seeds = parseSeedInput(body.seeds, variantsCount)
      const pack = await updateAvatarPack(packId, {
        name: typeof body.name === 'string' ? body.name : undefined,
        dicebearStyle: typeof body.dicebearStyle === 'string' ? body.dicebearStyle : undefined,
        variantsCount,
        seeds,
      })
      if (body.setAsActive === true) {
        await setActiveAvatarPack(packId)
      }
      return NextResponse.json({ success: true, pack })
    }

    if (action === 'set-status') {
      const pack = await toggleAvatarPackStatus(packId, Boolean(body.isActive))
      return NextResponse.json({ success: true, pack })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update avatar pack' }, { status: 400 })
  }
}

