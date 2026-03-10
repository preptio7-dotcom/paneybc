import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neon } from '@neondatabase/serverless'

// ─── Types ───────────────────────────────────────────────────────────────────
const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  neonSql?: ReturnType<typeof neon>
}

// ─── Database URL ─────────────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is missing. Make sure it is set in your environment variables.'
  )
}

// ─── Neon SQL connection (reused across invocations) ─────────────────────────
// Cache the neon() connection on global so it's reused on warm invocations
const sql = globalForPrisma.neonSql ?? neon(databaseUrl)
globalForPrisma.neonSql = sql

// ─── Prisma Client (singleton for all environments) ──────────────────────────
// IMPORTANT: must cache in production too — Vercel reuses function instances
// on warm starts, saving CPU on every request after the first cold start
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon(sql),
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  })

// Save to global in ALL environments (critical for production performance)
globalForPrisma.prisma = prisma

export default prisma