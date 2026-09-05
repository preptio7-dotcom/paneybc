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

export async function isWhitelistedIp(ipAddress: string) {
  const normalized = normalizeIpAddress(ipAddress)
  if (!normalized) return false
  const entry = await prisma.whitelistedIp.findUnique({
    where: { ipAddress: normalized },
    select: { id: true },
  })
  return Boolean(entry)
}

export async function getBlockedIpEntry(ipAddress: string) {
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
    return prisma.ipActivityLog.update({
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

  return prisma.ipActivityLog.create({
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
  })

  return blocked
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
  const blockedEntries = [
    await blockIpAddress({
      ipAddress: normalizedIp,
      reason: input.reason,
      blockedBy: input.blockedBy,
      blockSource: input.blockSource,
      totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock,
    }),
  ]

  if (input.alsoBlockSubnet) {
    const subnet = toIPv4Subnet(normalizedIp)
    if (subnet) {
      blockedEntries.push(
        await blockIpAddress({
          ipAddress: subnet,
          reason: `${input.reason} (subnet /24 block)`,
          blockedBy: input.blockedBy,
          blockSource: input.blockSource,
          totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock,
          isSubnet: true,
        })
      )
    }
  }

  return blockedEntries
}

export async function unblockIpAddress(ipAddress: string) {
  const normalized = normalizeIpAddress(ipAddress)
  if (!normalized) return 0
  const result = await prisma.blockedIp.updateMany({
    where: { ipAddress: normalized, isActive: true },
    data: { isActive: false },
  })

  await prisma.ipActivityLog.updateMany({
    where: { ipAddress: normalized, status: 'blocked' },
    data: { status: 'resolved', isReviewed: true, reviewedAt: new Date() },
  })

  return result.count
}

export async function addWhitelistedIp(input: {
  ipAddress: string
  label?: string | null
  addedBy: string
}) {
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
  })

  await prisma.ipActivityLog.updateMany({
    where: { ipAddress, status: { in: ['active_threat', 'suspicious', 'blocked'] } },
    data: { status: 'resolved', isReviewed: true, reviewedAt: new Date() },
  })

  return whitelist
}

export async function removeWhitelistedIpById(id: string) {
  return prisma.whitelistedIp.delete({
    where: { id },
  })
}

export async function recordIpSecurityAudit(input: {
  adminId: string
  action: string
  ipAddress: string
  reason?: string | null
  metadata?: Prisma.InputJsonValue
}) {
  return prisma.ipSecurityAudit.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      ipAddress: normalizeIpAddress(input.ipAddress),
      reason: input.reason || null,
      metadata: input.metadata,
    },
  })
}

export async function maybeAutoBlockIp(input: {
  ipAddress: string
  reason: string
  totalAttemptsBeforeBlock?: number
}) {
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

  return blockIpAddress({
    ipAddress,
    reason: input.reason,
    blockedBy: 'auto',
    blockSource: 'auto',
    totalAttemptsBeforeBlock: input.totalAttemptsBeforeBlock || triggerCount,
  })
}
