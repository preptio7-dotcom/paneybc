import { Pool, neon } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  neonSql: ReturnType<typeof neon> | undefined
}

// ─── Prisma Client (singleton for ALL environments) ──────────────────────────
// IMPORTANT: cache in production too — Vercel reuses function instances
// on warm starts, saving CPU on every request after the first cold start
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Save to global in ALL environments (critical for production performance)
globalForPrisma.prisma = prisma

// ─── Neon SQL connection (reused across invocations) ─────────────────────────
export const neonSql = globalForPrisma.neonSql ?? neon(process.env.DATABASE_URL!)
globalForPrisma.neonSql = neonSql

export default prisma
