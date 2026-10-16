import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth-cookie'
import { resolveAvatarForUser } from '@/lib/avatar-pack-service'
import { getOrgAdminMembership, toPublicOrgSummary } from '@/lib/org-access'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const decodedUser = getCurrentUser(request)
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: decodedUser.userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      const response = NextResponse.json({ error: 'Account banned' }, { status: 403 })
      clearAuthCookie(response, {
        cookieName: 'token',
        isProd: process.env.NODE_ENV === 'production',
        host: request.nextUrl.hostname,
        configuredDomain: process.env.COOKIE_DOMAIN,
      })
      return response
    }

    const resolvedAvatar = await resolveAvatarForUser(user)

    const orgMembership = await getOrgAdminMembership(user.id)

    return NextResponse.json(
      {
        message: 'User retrieved successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarId: resolvedAvatar.avatarId,
          avatar: resolvedAvatar.avatar,
          role: user.role,
          studentRole: user.studentRole,
          popupDismissed: user.popupDismissed,
          referralCode: user.referralCode,
          referralLink: user.referralLink,
          org: toPublicOrgSummary(orgMembership),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Me endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

