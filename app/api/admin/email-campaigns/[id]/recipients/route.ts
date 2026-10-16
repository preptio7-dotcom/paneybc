export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminUser } from '@/lib/admin-auth'
import { getDailyEmailLimit, startOfTodayUtc } from '@/lib/email-campaigns'

type Params = { params: Promise<{ id: string }> }

const STATUSES = ['pending', 'sent', 'failed'] as const
type RecipientStatus = (typeof STATUSES)[number]

function csvCell(value: unknown) {
  const text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * GET /api/admin/email-campaigns/[id]/recipients
 *   ?status=pending|sent|failed   filter (omit for all)
 *   ?page=1&limit=50              pagination
 *   ?format=csv                   full export for the filter (max 10,000 rows)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const admin = requireAdminUser(request)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const schedule = await prisma.emailSchedule.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, sendAt: true, sentAt: true, lastError: true },
    })
    if (!schedule) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const status = STATUSES.includes(statusParam as RecipientStatus) ? (statusParam as RecipientStatus) : null
    const where = { scheduleId: id, ...(status ? { status } : {}) }

    if (searchParams.get('format') === 'csv') {
      const rows = await prisma.emailCampaignRecipient.findMany({
        where,
        orderBy: [{ status: 'asc' }, { sentAt: 'asc' }, { email: 'asc' }],
        take: 10000,
        select: { email: true, name: true, status: true, sentAt: true, attempts: true, lastError: true },
      })
      const header = ['email', 'name', 'status', 'sent_at', 'attempts', 'last_error']
      const lines = [header.join(',')].concat(
        rows.map((r) => [r.email, r.name, r.status, r.sentAt, r.attempts, r.lastError].map(csvCell).join(','))
      )
      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="campaign-${id}-${status || 'all'}.csv"`,
        },
      })
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const [rows, filteredTotal, grouped, sentToday] = await Promise.all([
      prisma.emailCampaignRecipient.findMany({
        where,
        orderBy: [{ status: 'asc' }, { sentAt: 'desc' }, { email: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, email: true, name: true, status: true, sentAt: true, attempts: true, lastError: true },
      }),
      prisma.emailCampaignRecipient.count({ where }),
      prisma.emailCampaignRecipient.groupBy({
        by: ['status'],
        where: { scheduleId: id },
        _count: { _all: true },
      }),
      prisma.emailCampaignRecipient.count({
        where: { status: 'sent', sentAt: { gte: startOfTodayUtc() } },
      }),
    ])

    const counts = { pending: 0, sent: 0, failed: 0 }
    for (const g of grouped) counts[g.status as RecipientStatus] = g._count._all

    const dailyLimit = getDailyEmailLimit()
    return NextResponse.json({
      schedule,
      counts: { ...counts, total: counts.pending + counts.sent + counts.failed },
      quota: {
        dailyLimit,
        sentToday,
        leftToday: Math.max(0, dailyLimit - sentToday),
        daysToFinishPending: counts.pending === 0 ? 0 : Math.ceil(counts.pending / dailyLimit),
      },
      rows,
      filteredTotal,
      page,
      pages: Math.max(1, Math.ceil(filteredTotal / limit)),
    })
  } catch (err) {
    console.error('[admin/email-campaigns/recipients] GET error:', err)
    return NextResponse.json({ error: 'Failed to load recipients' }, { status: 500 })
  }
}
