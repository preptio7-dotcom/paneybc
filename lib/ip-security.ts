import { Prisma, SecurityActivityType, SecurityEventStatus, IpBlockSource } from '@prisma/client'
import { isIP } from 'node:net'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/rate-limit'

type RequestLike = { headers: Headers }

const EVENT_GROUP_WINDOW_MS = 60 * 60 * 1000
const AUTO_BLOCK_THRESHOLD = 3
const AUTO_BLOCK_WINDOW_MS = 24 * 60 * 60 * 1000

const STATUS_PRIORITY: Record<SecurityEventStatus, number> = {
  resolved: 0,
  suspicious: 1,
  active_threat: 2,
  blocked: 3,
}

export function normalizeIpAddress(ipAddress: string) {
  const value = String(ipAddress || '').trim()
  if (!value) return ''
  return value.replace(/^::ffff:/i, '')
}

export function getRequestIpAddress(request: RequestLike) {
  return normalizeIpAddress(getClientIp(request))
}

export function isValidIpAddress(ipAddress: string) {
  return isIP(normalizeIpAddress(ipAddress)) !== 0
}

export function toIPv4Subnet(ipAddress: string) {
  const normalized = normalizeIpAddress(ipAddress)
  if (isIP(normalized) !== 4) return null
  const parts = normalized.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}

function isIpv4InSubnet(ipAddress: string, subnetCidr: string) {
  const normalized = normalizeIpAddress(ipAddress)
  if (isIP(normalized) !== 4) return false
  if (!subnetCidr.endsWith('/24')) return false
  const subnet = subnetCidr.split('/')[0]
  const ipParts = normalized.split('.')
  const subnetParts = subnet.split('.')
  if (ipParts.length !== 4 || subnetParts.length !== 4) return false
  return ipParts[0] === subnetParts[0] && ipParts[1] === subnetParts[1] && ipParts[2] === subnetParts[2]
}

function maxStatus(current: SecurityEventStatus, incoming: SecurityEventStatus) {
  return STATUS_PRIORITY[incoming] >= STATUS_PRIORITY[current] ? incoming : current
}

let isEnsuringTables = false

export async function ensureSecurityTables() {
  if (isEnsuringTables) return
  isEnsuringTables = true

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "IpBlockSource" AS ENUM ('admin', 'automatic_threat');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "SecurityEventStatus" AS ENUM ('clean', 'suspicious', 'active_threat', 'blocked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "SecurityActivityType" AS ENUM (
          'admin_login_success',
          'admin_login_failed',
          'admin_otp_failed',
          'admin_forgot_password_request',
          'admin_resend_otp',
          'student_login_failed',
          'student_signup_code_request',
          'student_signup_verify_failed',
          'student_forgot_password_request',
          'student_reset_password_request',
          'feedback_spam_attempt',
          'ambassador_spam_attempt',
          'contact_spam_attempt'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "blocked_ips" (
        "id" TEXT NOT NULL,
        "ip_address" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "blocked_by" TEXT NOT NULL,
        "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "block_source" "IpBlockSource" NOT NULL DEFAULT 'admin',
        "total_attempts_before_block" INTEGER NOT NULL DEFAULT 0,
        "is_subnet" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "whitelisted_ips" (
        "id" TEXT NOT NULL,
        "ip_address" TEXT NOT NULL,
        "label" TEXT,
        "added_by" TEXT NOT NULL,
        "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "whitelisted_ips_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "ip_activity_log" (
        "id" TEXT NOT NULL,
        "ip_address" TEXT NOT NULL,
        "activity_type" "SecurityActivityType" NOT NULL,
        "status" "SecurityEventStatus" NOT NULL DEFAULT 'suspicious',
        "target_user_id" TEXT,
        "target_endpoint" TEXT,
        "attempted_email" TEXT,
        "attempts_count" INTEGER NOT NULL DEFAULT 1,
        "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_reviewed" BOOLEAN NOT NULL DEFAULT false,
        "reviewed_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ip_activity_log_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "ip_security_audit" (
        "id" TEXT NOT NULL,
        "admin_id" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "ip_address" TEXT NOT NULL,
        "reason" TEXT,
        "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "metadata" JSONB,
        CONSTRAINT "ip_security_audit_pkey" PRIMARY KEY ("id")
      );
    `)
    console.log('[IP Security] Tables auto-created or already exist.')
  } catch (err: any) {
    console.warn('[IP Security] Could not auto-create security tables:', err?.message)
  } finally {
    isEnsuringTables = false
  }
}

export async function isWhitelistedIp(ipAddress: string) {
  try {
    const normalized = normalizeIpAddress(ipAddress)
    if (!normalized) return false
    const entry = await prisma.whitelistedIp.findUnique({
      where: { ipAddress: normalized },
      select: { id: true },
    })
    return Boolean(entry)
  } catch (error: any) {
    console.warn('[IP Security] isWhitelistedIp check failed:', error?.message)
    void ensureSecurityTables()
    return false
  }
}

export async function getBlockedIpEntry(ipAddress: string) {
  try {
    const normalized = normalizeIpAddress(ipAddress)
    if (!normalized) return null

    const exact = await prisma.blockedIp.findFirst({
      where: { ipAddress: normalized, isActive: true },
      orderBy: { blockedAt: 'desc' },
    })
    if (exact) return exact

    const subnetEntries = await prisma.blockedIp.findMany({
      where: { isActive: true, isSubnet: true },
      orderBy: { blockedAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        reason: true,
        blockedBy: true,
        blockedAt: true,
        isActive: true,
        blockSource: true,
        totalAttemptsBeforeBlock: true,
        isSubnet: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return subnetEntries.find((item) => isIpv4InSubnet(normalized, item.ipAddress)) || null
  } catch (error: any) {
    console.warn('[IP Security] getBlockedIpEntry check failed:', error?.message)
    void ensureSecurityTables()
    return null
  }
}

export async function getIpAccess(ipAddress: string) {
  const normalized = normalizeIpAddress(ipAddress)
  if (!normalized) {
    return {
      ipAddress: normalized,
      isWhitelisted: false,
      isBlocked: false,
      blockedEntry: null as Awaited<ReturnType<typeof getBlockedIpEntry>>,
    }
  }

  try {
    const [whitelisted, blockedEntry] = await Promise.all([
      isWhitelistedIp(normalized),
      getBlockedIpEntry(normalized),
    ])

    return {
      ipAddress: normalized,
      isWhitelisted: whitelisted,
      isBlocked: !whitelisted && Boolean(blockedEntry),
      blockedEntry,
    }
  } catch (error: any) {
    console.warn('[IP Security] getIpAccess failed, failing open for access:', error?.message)
    return {
      ipAddress: normalized,
      isWhitelisted: false,
      isBlocked: false,
      blockedEntry: null,
    }
  }
}

type LogSecurityEventInput = {
  ipAddress: string
  activityType: SecurityActivityType
  status?: SecurityEventStatus
  targetUserId?: string | null
  targetEndpoint?: string | null
  attemptedEmail?: string | null
  attemptsIncrement?: number
}

export async function logSecurityEvent(input: LogSecurityEventInput) {
  try {
    const ipAddress = normalizeIpAddress(input.ipAddress)
    if (!ipAddress) return null

    const status = input.status || 'suspicious'
    const attemptsIncrement = Math.max(1, Number(input.attemptsIncrement || 1))
    const now = new Date()
    const windowStart = new Date(now.getTime() - EVENT_GROUP_WINDOW_MS)

    const existing = await prisma.ipActivityLog.findFirst({
      where: {
        ipAddress,
        activityType: input.activityType,
        targetUserId: input.targetUserId || null,
        targetEndpoint: input.targetEndpoint || null,
        lastSeen: { gte: windowStart },
      },
      orderBy: { lastSeen: 'desc' },
    })

    if (existing) {
      return await prisma.ipActivityLog.update({
        where: { id: existing.id },
        data: {
          attemptsCount: existing.attemptsCount + attemptsIncrement,
          lastSeen: now,
          status: maxStatus(existing.status, status),
          isReviewed: false,
          reviewedAt: null,
          ...(input.attemptedEmail ? { attemptedEmail: input.attemptedEmail } : {}),
        },
      })
    }

    return await prisma.ipActivityLog.create({
      data: {
        ipAddress,
        activityType: input.activityType,
        status,
        targetUserId: input.targetUserId || null,
        targetEndpoint: input.targetEndpoint || null,
        attemptedEmail: input.attemptedEmail || null,
        attemptsCount: attemptsIncrement,
        firstSeen: now,
        lastSeen: now,
      },
    })
  } catch (error: any) {
    console.warn('[IP Security] logSecurityEvent failed:', error?.message)
    void ensureSecurityTables()
    return null
  }
}

type BlockIpInput = {
  ipAddress: string
  reason: string
  blockedBy: string
  blockSource: IpBlockSource
  totalAttemptsBeforeBlock?: number
  isSubnet?: boolean
}

export async function blockIpAddress(input: BlockIpInput) {
  try {
    const ipAddress = normalizeIpAddress(input.ipAddress)
    if (!isValidIpAddress(ipAddress) && !(input.isSubnet && ipAddress.endsWith('/24'))) {
      throw new Error('Invalid IP address')
    }

    const now = new Date()
    const blocked = await prisma.blockedIp.upsert({
      where: { ipAddress },
      create: {
        ipAddress,
        reason: input.reason,
        blockedBy: input.blockedBy,
        blockSource: input.blockSource,
        totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock || 0,
        isSubnet: Boolean(input.isSubnet),
        blockedAt: now,
        isActive: true,
      },
      update: {
        reason: input.reason,
        blockedBy: input.blockedBy,
        blockSource: input.blockSource,
        totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock || 0,
        isSubnet: Boolean(input.isSubnet),
        blockedAt: now,
        isActive: true,
      },
    })

    await prisma.ipActivityLog.updateMany({
      where: { ipAddress, status: { in: ['active_threat', 'suspicious'] } },
      data: { status: 'blocked', isReviewed: false, reviewedAt: null, lastSeen: now },
    }).catch(() => null)

    return blocked
  } catch (error: any) {
    console.warn('[IP Security] blockIpAddress failed:', error?.message)
    void ensureSecurityTables()
    return null
  }
}

export async function blockIpWithOptionalSubnet(input: {
  ipAddress: string
  reason: string
  blockedBy: string
  blockSource: IpBlockSource
  totalAttemptsBeforeBlock?: number
  alsoBlockSubnet?: boolean
}) {
  const normalizedIp = normalizeIpAddress(input.ipAddress)
  const first = await blockIpAddress({
    ipAddress: normalizedIp,
    reason: input.reason,
    blockedBy: input.blockedBy,
    blockSource: input.blockSource,
    totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock,
  })
  const blockedEntries = first ? [first] : []

  if (input.alsoBlockSubnet) {
    const subnet = toIPv4Subnet(normalizedIp)
    if (subnet) {
      const second = await blockIpAddress({
        ipAddress: subnet,
        reason: `${input.reason} (subnet /24 block)`,
        blockedBy: input.blockedBy,
        blockSource: input.blockSource,
        totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock,
        isSubnet: true,
      })
      if (second) blockedEntries.push(second)
    }
  }

  return blockedEntries
}

export async function unblockIpAddress(ipAddress: string) {
  try {
    const normalized = normalizeIpAddress(ipAddress)
    if (!normalized) return 0
    const result = await prisma.blockedIp.updateMany({
      where: { ipAddress: normalized, isActive: true },
      data: { isActive: false },
    })

    await prisma.ipActivityLog.updateMany({
      where: { ipAddress: normalized, status: 'blocked' },
      data: { status: 'resolved', isReviewed: true, reviewedAt: new Date() },
    }).catch(() => null)

    return result.count
  } catch (error: any) {
    console.warn('[IP Security] unblockIpAddress failed:', error?.message)
    return 0
  }
}

export async function addWhitelistedIp(input: {
  ipAddress: string
  label?: string | null
  addedBy: string
}) {
  try {
    const ipAddress = normalizeIpAddress(input.ipAddress)
    if (!isValidIpAddress(ipAddress)) {
      throw new Error('Invalid IP address')
    }

    const whitelist = await prisma.whitelistedIp.upsert({
      where: { ipAddress },
      create: {
        ipAddress,
        label: input.label || null,
        addedBy: input.addedBy,
      },
      update: {
        label: input.label || null,
        addedBy: input.addedBy,
        addedAt: new Date(),
      },
    })

    await prisma.blockedIp.updateMany({
      where: { ipAddress, isActive: true },
      data: { isActive: false },
    }).catch(() => null)

    await prisma.ipActivityLog.updateMany({
      where: { ipAddress, status: { in: ['active_threat', 'suspicious', 'blocked'] } },
      data: { status: 'resolved', isReviewed: true, reviewedAt: new Date() },
    }).catch(() => null)

    return whitelist
  } catch (error: any) {
    console.warn('[IP Security] addWhitelistedIp failed:', error?.message)
    void ensureSecurityTables()
    throw error
  }
}

export async function removeWhitelistedIpById(id: string) {
  try {
    return await prisma.whitelistedIp.delete({
      where: { id },
    })
  } catch (error: any) {
    console.warn('[IP Security] removeWhitelistedIpById failed:', error?.message)
    return null
  }
}

export async function recordIpSecurityAudit(input: {
  adminId: string
  action: string
  ipAddress: string
  reason?: string | null
  metadata?: Prisma.InputJsonValue
}) {
  try {
    return await prisma.ipSecurityAudit.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        ipAddress: normalizeIpAddress(input.ipAddress),
        reason: input.reason || null,
        metadata: input.metadata,
      },
    })
  } catch (error: any) {
    console.warn('[IP Security] recordIpSecurityAudit failed:', error?.message)
    void ensureSecurityTables()
    return null
  }
}

export async function maybeAutoBlockIp(input: {
  ipAddress: string
  reason: string
  totalAttemptsBeforeBlock?: number
}) {
  try {
    const ipAddress = normalizeIpAddress(input.ipAddress)
    if (!isValidIpAddress(ipAddress)) return null

    const whitelisted = await isWhitelistedIp(ipAddress)
    if (whitelisted) return null

    const existingBlock = await prisma.blockedIp.findFirst({
      where: { ipAddress, isActive: true },
      select: { id: true },
    })
    if (existingBlock) return null

    const since = new Date(Date.now() - AUTO_BLOCK_WINDOW_MS)
    const triggerCount = await prisma.ipActivityLog.count({
      where: {
        ipAddress,
        activityType: 'brute_force_attempt',
        lastSeen: { gte: since },
      },
    })

    if (triggerCount < AUTO_BLOCK_THRESHOLD) return null

    return await blockIpAddress({
      ipAddress,
      reason: input.reason,
      blockedBy: 'auto',
      blockSource: 'auto',
      totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock || triggerCount,
    })
  } catch (error: any) {
    console.warn('[IP Security] maybeAutoBlockIp failed:', error?.message)
    return null
  }
}
