export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const DEFAULT_COMMUNITY_TEMPLATE = {
  name: 'Preptio Community Announcement',
  category: 'general' as const,
  subject: 'Introducing Preptio Community: Discuss, Ask & Learn Together! 🚀',
  body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 36px 32px; text-align: center; color: #ffffff;">
    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">New Feature Launch</span>
    <h1 style="margin: 0; font-size: 26px; font-weight: 800; line-height: 1.25;">Welcome to Preptio Community! 🚀</h1>
    <p style="margin: 10px 0 0; font-size: 15px; opacity: 0.95;">Discuss, ask questions, share notes, and prepare smarter together.</p>
  </div>
  
  <div style="padding: 32px 28px; color: #334155; font-size: 15px; line-height: 1.6;">
    <p style="margin-top: 0;">Hello Preptio Scholar,</p>
    <p>We're thrilled to introduce the brand new <strong>Preptio Student Community</strong> — your interactive hub to collaborate, solve tough exam questions, and learn from peers and mentors.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; color: #0f172a; font-size: 16px; font-weight: 700;">✨ What you can do in Community:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569;">
        <li style="margin-bottom: 8px;"><strong>Ask Questions & Get Answers:</strong> Post questions on difficult concepts and mark verified solutions.</li>
        <li style="margin-bottom: 8px;"><strong>Anonymous Posting Option:</strong> Prefer privacy? Post questions or comments anonymously anytime.</li>
        <li style="margin-bottom: 8px;"><strong>Rich Markdown & Images:</strong> Upload diagrams, worksheets, and format your workings cleanly.</li>
        <li style="margin-bottom: 0;"><strong>Filter by Subject & Track:</strong> Browse discussions organized by subjects, top upvoted topics, and solved status.</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0 20px;">
      <a href="https://preptio.com/community" style="display: inline-block; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);">Explore Community Now →</a>
    </div>
    <p style="text-align: center; font-size: 13px; color: #64748b; margin-top: 0;">Jump right into the discussions and start participating today!</p>
  </div>
</div>`,
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
