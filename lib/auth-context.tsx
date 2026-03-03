'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  avatarId?: string
  role: 'student' | 'admin' | 'super_admin'
  studentRole?: 'user' | 'ambassador' | 'paid' | 'unpaid'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    name: string,
    options?: {
      degree?: string
      level?: string
      institute?: string
      city?: string
      studentId?: string
      phone?: string
      instituteRating?: number
      acceptedTerms?: boolean
      verificationToken?: string
      website?: string
      startedAt?: number
      blogReferral?: {
        post_id?: string
        post_slug?: string
        visited_at?: number
        session_id?: string
      }
    }
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error)
    }

    const data = await response.json()
    setUser(data.user)
    try {
      localStorage.setItem('preptio_welcome_unread', '1')
    } catch (error) {
      // ignore storage errors
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    options?: {
      degree?: string
      level?: string
      institute?: string
      city?: string
      studentId?: string
      phone?: string
      instituteRating?: number
      acceptedTerms?: boolean
      verificationToken?: string
      website?: string
      startedAt?: number
      blogReferral?: {
        post_id?: string
        post_slug?: string
        visited_at?: number
        session_id?: string
      }
    }
  ) => {
    const resolvedBlogReferral = (() => {
      if (options?.blogReferral) return options.blogReferral
      if (typeof window === 'undefined') return null
      try {
        const raw = sessionStorage.getItem('blog_referral')
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return typeof parsed === 'object' && parsed ? parsed : null
      } catch {
        return null
      }
    })()

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        ...options,
        blogReferral: resolvedBlogReferral || undefined,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error)
    }

    const data = await response.json()
    setUser(data.user)
    try {
      localStorage.setItem('preptio_welcome_unread', '1')
      sessionStorage.removeItem('blog_referral')
    } catch (error) {
      // ignore storage errors
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (error) {
        // ignore storage errors
      }

      try {
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
      } catch (error) {
        // ignore cache errors
      }

      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map((reg) => reg.unregister()))
        }
      } catch (error) {
        // ignore service worker errors
      }

      window.location.href = '/?loggedOut=1'
    }
  }

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
