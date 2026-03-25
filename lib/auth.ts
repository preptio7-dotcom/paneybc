import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface DecodedToken {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    return decoded as DecodedToken
  } catch (error) {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get('token')?.value
  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }
  }
  return token || null
}

export function getCurrentUser(request: NextRequest): DecodedToken | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}
