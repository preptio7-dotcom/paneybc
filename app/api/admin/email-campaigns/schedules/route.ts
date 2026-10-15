export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const schedules = await prisma.emailSchedule.findMany({
      include: { template: true },
      orderBy: { sendAt: 'desc' },
    })

    const mapped = schedules.map((s) => ({
      ...s,
      _id: s.id,
      templateId: s.template ? { ...s.template, _id: s.template.id } : null,
    }))

    return NextResponse.json({ schedules: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const {
      name,
      templateId,
      segment,
      sendAt,
      specificEmails,
      newWithinDays,
      activeWithinDays,
      inactiveDays,
      examDaysBefore,
    } = await request.json()

    if (!name || !templateId || !segment || !sendAt) {
      return NextResponse.json({ error: 'Name, template, segment, and send time are required' }, { status: 400 })
    }

    if (segment === 'specific_users' && (!specificEmails || !specificEmails.trim())) {
      return NextResponse.json({ error: 'Please enter at least one valid recipient email address' }, { status: 400 })
    }

    const schedule = await prisma.emailSchedule.create({
      data: {
        name,
        templateId,
        segment: segment as any,
        sendAt: new Date(sendAt),
        specificEmails: specificEmails || null,
        newWithinDays: newWithinDays || 1,
        activeWithinDays: activeWithinDays || 7,
        inactiveDays: inactiveDays || 14,
        examDaysBefore: examDaysBefore || 30,
        status: 'scheduled',
      },
      include: { template: true },
    })

    return NextResponse.json({
      schedule: {
        ...schedule,
        _id: schedule.id,
        templateId: schedule.template ? { ...schedule.template, _id: schedule.template.id } : null,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id, ...updates } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Schedule id is required' }, { status: 400 })
    }

    if (updates.sendAt) {
      updates.sendAt = new Date(updates.sendAt)
    }

    const schedule = await prisma.emailSchedule.update({
      where: { id },
      data: updates,
      include: { template: true },
    })
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({
      schedule: {
        ...schedule,
        _id: schedule.id,
        templateId: schedule.template ? { ...schedule.template, _id: schedule.template.id } : null,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Schedule id is required' }, { status: 400 })
    }

    await prisma.emailSchedule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
