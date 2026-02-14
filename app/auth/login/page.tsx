'use client'

import React, { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    if (loading) return
    if (user?.role === 'admin') {
      router.replace('/admin')
      return
    }
    if (user) {
      router.replace('/dashboard')
    }
  }, [loading, router, user])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      await login(formData.email, formData.password)

      toast({
        title: "Success",
        description: "Logged in successfully. Redirecting...",
      })

      // Fetch user info to check role
      const meResponse = await fetch('/api/auth/me', { credentials: 'include' })
      const meData = await meResponse.json()

      if (meData.user?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.log("[v0] Login error:", error)
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-[#0F7938]">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-center">
                Login to your Preptio account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                    required
                  />
                  <div className="flex justify-end mt-1">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-semibold text-[#0F7938] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <Link href="/auth/signup" className="text-[#0F7938] hover:underline font-semibold">
                  Sign up here
                </Link>
              </div>
              <div className="mt-4 text-center">
                <Link href="/contact">
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
