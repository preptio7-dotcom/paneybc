import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DecodedToken } from '@/lib/auth'

type AuditPayload = {
  request?: NextRequest
  actor: DecodedToken
  action: string
  targetType?: string
  targetId?: string
  before?: unknown
  after?: unknown
  metadata?: unknown
}

function resolveIp(request?: NextRequest) {
  if (!request) return null
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }
  return request.headers.get('x-real-ip') || null
}

export async function createAdminAuditLog(payload: AuditPayload) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: payload.actor.userId,
        actorEmail: payload.actor.email,
        actorRole: payload.actor.role,
        action: payload.action,
        targetType: payload.targetType || null,
        targetId: payload.targetId || null,
        before: (payload.before ?? null) as any,
        after: (payload.after ?? null) as any,
        metadata: (payload.metadata ?? null) as any,
        ip: resolveIp(payload.request),
        userAgent: payload.request?.headers.get('user-agent') || null,
      },
    })
  } catch (error) {
    console.error('Admin audit log failed:', error)
  }
}

