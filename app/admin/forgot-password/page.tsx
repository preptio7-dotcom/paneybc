'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function AdminForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your admin email.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link')
      }

      toast({
        title: 'Check your email',
        description: data.message || 'If an account exists, a reset link has been sent.',
      })
      setEmail('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset link.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#0F7938]">
              Admin Password Reset
            </CardTitle>
            <CardDescription className="text-center">
              Enter your admin email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Admin Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link href="/admin/login" className="text-[#0F7938] hover:underline font-semibold">
                Back to Admin Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
