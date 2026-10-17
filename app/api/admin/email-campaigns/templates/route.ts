export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { COMMUNITY_ANNOUNCEMENT_TEMPLATE } from '@/lib/email-templates'

// Canonical copy lives in lib/email-templates.ts so the admin panel, the API and
// the mobile preview all render from exactly the same markup.
const DEFAULT_COMMUNITY_TEMPLATE = {
  ...COMMUNITY_ANNOUNCEMENT_TEMPLATE,
  status: 'active' as const,
}

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let templates = await prisma.emailTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    // If no community template exists yet, auto-create the default community template
    if (!templates.some((t) => t.name.toLowerCase().includes('community'))) {
      const communityTemplate = await prisma.emailTemplate.create({
        data: DEFAULT_COMMUNITY_TEMPLATE,
      })
      templates = [communityTemplate, ...templates]
    }

    return NextResponse.json({
      templates: templates.map((t) => ({ ...t, _id: t.id })),
      defaultCommunityTemplate: DEFAULT_COMMUNITY_TEMPLATE,
    })
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

    const { name, category, subject, body, status } = await request.json()
    if (!name || !subject || !body) {
      return NextResponse.json({ error: 'Name, subject, and body are required' }, { status: 400 })
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        category: (category as any) || 'general',
        subject,
        body,
        status: (status as any) || 'draft',
      },
    })

    return NextResponse.json({ template: { ...template, _id: template.id } })
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
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 })
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updates,
    })
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template: { ...template, _id: template.id } })
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
      return NextResponse.json({ error: 'Template id is required' }, { status: 400 })
    }

    await prisma.emailTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
