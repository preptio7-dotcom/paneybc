import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }
const envLocalPath = resolve(process.cwd(), '.env.local')
if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath })
} else {
  loadEnv()
}

let databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  const envPath = resolve(process.cwd(), '.env')
  const tryPaths = [envLocalPath, envPath]
  for (const p of tryPaths) {
    if (!existsSync(p)) continue
    const raw = readFileSync(p, 'utf8')
    const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL='))
    if (line) {
      databaseUrl = line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
      break
    }
  }
}

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl
}

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing at runtime')
}

if (process.env.NODE_ENV !== 'production') {
  try {
    const parsed = new URL(databaseUrl)
    console.log('[Prisma] DATABASE_URL host:', parsed.host)
  } catch {
    console.log('[Prisma] DATABASE_URL parse failed')
  }
}

// Fallback for drivers that rely on PG* env vars instead of DATABASE_URL
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
  // ignore parse failures; DATABASE_URL will be used directly
}

const sql = neon(databaseUrl)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon(sql),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
