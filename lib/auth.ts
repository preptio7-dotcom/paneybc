import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { getJwtSecret } from '@/lib/jwt-secret'

export interface DecodedToken {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    return decoded as DecodedToken
  } catch (error) {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest | Request): string | null {
  if ('cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
    const token = (request as NextRequest).cookies.get('token')?.value
    if (token) return token
  } else {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
      if (match) return decodeURIComponent(match[1])
    }
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

export function getCurrentUser(request: NextRequest | Request): DecodedToken | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

export function isAdmin(requestOrUser: NextRequest | Request | DecodedToken | null | undefined): boolean {
  if (!requestOrUser) return false
  if ('role' in requestOrUser && typeof requestOrUser.role === 'string') {
    return requestOrUser.role === 'admin' || requestOrUser.role === 'super_admin'
  }
  const user = getCurrentUser(requestOrUser as NextRequest | Request)
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'))
}

