export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const schedules = await prisma.emailSchedule.findMany({
      include: { template: true },
      orderBy: { sendAt: 'desc' },
    })
    return NextResponse.json({ schedules })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const {
      name,
      templateId,
      segment,
      sendAt,
      newWithinDays,
      activeWithinDays,
      inactiveDays,
      examDaysBefore,
    } = await request.json()

    if (!name || !templateId || !segment || !sendAt) {
      return NextResponse.json({ error: 'Name, template, segment, and send time are required' }, { status: 400 })
    }

    const schedule = await prisma.emailSchedule.create({
      data: {
        name,
        templateId,
        segment,
        sendAt: new Date(sendAt),
        newWithinDays,
        activeWithinDays,
        inactiveDays,
        examDaysBefore,
        status: 'scheduled',
      },
    })

    return NextResponse.json({ schedule })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
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
    })
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ schedule })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || user.role !== 'admin') {
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

