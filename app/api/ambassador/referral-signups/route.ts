import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getCurrentUser(request)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: { studentRole: true, referralCode: true, id: true }
    })

    if (!dbUser || dbUser.studentRole !== 'ambassador') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: userId, referralCode } = dbUser

    if (!referralCode) {
      return NextResponse.json({ total: 0, signups: [] })
    }

    const data = await withCache(`ambassador:referral-signups:${userId}`, 300, async () => {
      const signups = await prisma.referralSignup.findMany({
        where: { referrerId: userId },
        include: {
          newUser: {
            select: {
              name: true,
              createdAt: true
            }
          }
        },
        orderBy: { signedUpAt: 'desc' }
      })

      return {
        total: signups.length,
        signups: signups.map((signup) => ({
          name: signup.newUser?.name || signup.newUserName || 'Unknown User',
          joinedAt: signup.signedUpAt.toISOString()
        }))
      }
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Ambassador referral signups fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
