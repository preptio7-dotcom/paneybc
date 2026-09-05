/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client')
const { PrismaNeon } = require('@prisma/adapter-neon')
const { neon } = require('@neondatabase/serverless')
const { config: loadEnv } = require('dotenv')
const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')

const envLocalPath = resolve(process.cwd(), '.env.local')
if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath })
} else {
  loadEnv()
}

if (!process.env.DATABASE_URL) {
  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    loadEnv({ path: envPath })
  }
}

if (!process.env.DATABASE_URL) {
  const tryPaths = [envLocalPath, resolve(process.cwd(), '.env')]
  for (const path of tryPaths) {
    if (!existsSync(path)) continue
    const raw = readFileSync(path, 'utf8')
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith('DATABASE_URL='))
    if (!line) continue
    const value = line
      .split('=')
      .slice(1)
      .join('=')
      .trim()
      .replace(/^"|"$/g, '')
    if (value) {
      process.env.DATABASE_URL = value
      break
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Cannot run avatar backfill.')
}

const databaseUrl = String(process.env.DATABASE_URL || '')
  .trim()
  .replace(/^"|"$/g, '')

if (!databaseUrl) {
  throw new Error('DATABASE_URL is empty after normalization.')
}

process.env.DATABASE_URL = databaseUrl

try {
  const parsed = new URL(databaseUrl)
  if (parsed.hostname) process.env.PGHOST = parsed.hostname
  if (parsed.port) process.env.PGPORT = parsed.port
  if (parsed.username) process.env.PGUSER = decodeURIComponent(parsed.username)
  if (parsed.password) process.env.PGPASSWORD = decodeURIComponent(parsed.password)
  if (parsed.pathname && parsed.pathname.length > 1) {
    process.env.PGDATABASE = decodeURIComponent(parsed.pathname.slice(1))
  }
  process.env.PGSSLMODE = 'require'
} catch {
  // ignore parse failures; DATABASE_URL will still be passed directly
}

const sql = neon(databaseUrl)
const prisma = new PrismaClient({
  adapter: new PrismaNeon(sql),
})
const BATCH_SIZE = 100
const BATCH_DELAY_MS = 100
const DEFAULT_STYLE = 'avataaars'
const DEFAULT_SEEDS = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'Nova',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hashString(input) {
  const value = String(input || '').trim() || 'Preptio'
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

async function ensureSettings() {
  let settings = await prisma.systemSettings.findFirst({
    select: { id: true, activeAvatarPackId: true },
  })

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {},
      select: { id: true, activeAvatarPackId: true },
    })
  }

  return settings
}

function normalizeSeeds(rawSeeds, variantsCount) {
  const safeCount = Math.max(5, Math.min(50, Number(variantsCount) || DEFAULT_SEEDS.length))
  const arraySeeds = Array.isArray(rawSeeds)
    ? rawSeeds.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  const source = arraySeeds.length ? arraySeeds : DEFAULT_SEEDS

  const deduped = []
  for (const seed of source) {
    if (!deduped.includes(seed)) {
      deduped.push(seed)
    }
  }

  let index = 0
  while (deduped.length < safeCount) {
    const fallback = `Pack${index}`
    if (!deduped.includes(fallback)) deduped.push(fallback)
    index += 1
  }

  return deduped.slice(0, safeCount)
}

async function ensureActivePack() {
  const settings = await ensureSettings()

  let activePack = null
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
        name: 'Default Pack',
        source: 'dicebear',
        dicebearStyle: DEFAULT_STYLE,
        variantsCount: DEFAULT_SEEDS.length,
        seeds: DEFAULT_SEEDS,
        isActive: true,
        createdBy: 'backfill-script',
      },
    })
  }

  await prisma.avatarPack.updateMany({
    where: { id: { not: activePack.id }, isActive: true },
    data: { isActive: false },
  })

  if (!activePack.isActive) {
    await prisma.avatarPack.update({
      where: { id: activePack.id },
      data: { isActive: true },
    })
  }

  if (settings.activeAvatarPackId !== activePack.id) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { activeAvatarPackId: activePack.id },
    })
  }

  return {
    id: activePack.id,
    seeds: normalizeSeeds(activePack.seeds, activePack.variantsCount),
  }
}

async function run() {
  let totalProcessed = 0
  let updatedCount = 0
  let failedCount = 0

  try {
    const [totalUsers, missingCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          OR: [{ avatarId: null }, { avatarId: '' }],
        },
      }),
    ])

    if (missingCount === 0) {
      console.log('Backfill already complete. No changes made.')
      return
    }

    const skippedCount = totalUsers - missingCount
    const activePack = await ensureActivePack()
    console.log(`Starting avatar backfill using active pack: ${activePack.id}`)
    console.log(`Users to backfill: ${missingCount}`)

    while (true) {
      const batch = await prisma.user.findMany({
        where: {
          OR: [{ avatarId: null }, { avatarId: '' }],
        },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
        select: {
          id: true,
          email: true,
          avatarId: true,
        },
      })

      if (!batch.length) {
        break
      }

      for (const user of batch) {
        totalProcessed += 1
        try {
          const avatarIndex = hashString(user.id) % activePack.seeds.length
          const avatarSeed = activePack.seeds[avatarIndex]
          const avatarId = `${activePack.id}:${avatarSeed}`

          await prisma.user.update({
            where: { id: user.id },
            data: { avatarId },
          })

          updatedCount += 1
          console.log(`Processing user ${user.id}... Done`)
        } catch (error) {
          failedCount += 1
          console.error(`Processing user ${user.id}... Failed`, error?.message || error)
        }
      }

      if (batch.length === BATCH_SIZE) {
        await sleep(BATCH_DELAY_MS)
      }
    }

    console.log('Backfill complete.')
    console.log(`Total users processed: ${totalProcessed}`)
    console.log(`Successfully updated: ${updatedCount}`)
    console.log(`Failed: ${failedCount}`)
    console.log(`Skipped (already had avatar): ${skippedCount}`)
  } catch (error) {
    console.error('Avatar backfill failed:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

run()
