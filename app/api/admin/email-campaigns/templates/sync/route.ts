export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CANONICAL_TEMPLATES } from '@/lib/email-templates'

/**
 * Overwrites the built-in templates in the database with the latest canonical
 * markup from lib/email-templates.ts (community announcement, the Day 0/1/3/7
 * activation drip and the streak reminder).
 *
 * This is the escape hatch for when a template was already saved/seeded with an
 * older design: the admin "Refresh designs" button calls this. Matching is by
 * name, so only the built-in templates are touched — user-created templates are
 * left alone. Existing rows keep their current status; newly created ones go
 * live immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let created = 0
    let updated = 0
    const templates: Array<{ _id: string; name: string; action: 'created' | 'updated' }> = []

    for (const canonical of CANONICAL_TEMPLATES) {
      const existing = await prisma.emailTemplate.findFirst({ where: { name: canonical.name } })

      if (existing) {
        const saved = await prisma.emailTemplate.update({
          where: { id: existing.id },
          data: {
            category: canonical.category as any,
            subject: canonical.subject,
            body: canonical.body,
          },
        })
        updated += 1
        templates.push({ _id: saved.id, name: saved.name, action: 'updated' })
      } else {
        const saved = await prisma.emailTemplate.create({
          data: {
            name: canonical.name,
            category: canonical.category as any,
            subject: canonical.subject,
            body: canonical.body,
            status: 'active',
          },
        })
        created += 1
        templates.push({ _id: saved.id, name: saved.name, action: 'created' })
      }
    }

    return NextResponse.json({ success: true, created, updated, templates })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
