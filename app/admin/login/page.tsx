'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

const OTP_COOLDOWN_SECONDS = 60

export default function AdminLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading, setUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [otpCode, setOtpCode] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [cooldownLeft, setCooldownLeft] = useState(OTP_COOLDOWN_SECONDS)
  const otpInputRef = useRef<HTMLInputElement | null>(null)
  const lastAutoSubmitCode = useRef<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  useEffect(() => {
    if (loading) return
    if (user?.role === 'admin') {
      router.replace('/admin')
      return
    }
    if (user) {
      toast({
        title: 'Access denied',
        description: 'Admin account required to access this page.',
        variant: 'destructive',
      })
      router.replace('/dashboard')
    }
  }, [loading, router, user, toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      setStep('otp')
      setAttemptsLeft(null)
      setCooldownLeft(OTP_COOLDOWN_SECONDS)
      toast({
        title: 'Verification required',
        description: `A 6-digit code has been sent to ${formData.email}.`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      })
  } finally {
    setIsLoading(false)
  }
}

  useEffect(() => {
    if (step !== 'otp') return
    if (cooldownLeft <= 0) return
    const timer = setInterval(() => {
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [step, cooldownLeft])

  useEffect(() => {
    if (step === 'otp') {
      otpInputRef.current?.focus()
    }
  }, [step])

  const handleResend = async () => {
    if (cooldownLeft > 0 || isLoading) return
    if (!formData.email) {
      toast({
        title: 'Error',
        description: 'Please enter your email first.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/admin/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code')
      }
      setCooldownLeft(OTP_COOLDOWN_SECONDS)
      toast({
        title: 'Code resent',
        description: `A new code was sent to ${formData.email}.`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend code.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (!formData.email || !otpCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: otpCode.trim() }),
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok) {
        if (typeof data.attemptsLeft === 'number') {
          setAttemptsLeft(data.attemptsLeft)
        }
        if (response.status === 403) {
          setStep('login')
        }
        throw new Error(data.error || 'Verification failed')
      }

      setUser(data.user)
      toast({
        title: 'Success',
        description: 'Admin login successful. Redirecting...',
      })
      router.push('/admin')
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid verification code.',
        variant: 'destructive',
      })
      setOtpCode('')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const normalized = otpCode.trim()
    if (step !== 'otp') return
    if (normalized.length !== 6) return
    if (isLoading) return
    if (lastAutoSubmitCode.current === normalized) return
    lastAutoSubmitCode.current = normalized
    verifyOTP()
  }, [otpCode, step, isLoading])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    await verifyOTP()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="animate-spin text-primary-green">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-[#0F7938]">
              Admin Login
            </CardTitle>
            <CardDescription className="text-center">
              Use your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@example.com"
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
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
                >
                  {isLoading ? 'Sending code...' : 'Request Verification Code'}
                </Button>

                <div className="text-center text-xs text-gray-500">
                  Forgot password?{' '}
                  <Link href="/admin/forgot-password" className="text-[#0F7938] hover:underline font-semibold">
                    Reset admin password
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="rounded-lg border border-[#0F7938]/20 bg-[#0F7938]/5 px-3 py-2 text-sm text-[#0F7938] text-center font-semibold">
                  Attempts remaining: {attemptsLeft ?? 3}
                </div>
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    disabled={isLoading}
                    className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938] text-center tracking-widest"
                    maxLength={6}
                    ref={otpInputRef}
                    required
                  />
                  {typeof attemptsLeft === 'number' && (
                    <p className="text-xs text-gray-500">
                      Attempts left: {attemptsLeft}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    We sent a 6-digit code to <span className="font-semibold">{formData.email}</span>.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || cooldownLeft > 0}
                  onClick={handleResend}
                  className="w-full"
                >
                  {cooldownLeft > 0 ? `Resend code in ${cooldownLeft}s` : 'Resend code'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep('login'); setOtpCode(''); setAttemptsLeft(null) }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to email login
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Not an admin? </span>
              <Link href="/auth/login" className="text-[#0F7938] hover:underline font-semibold">
                User login
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
  )
}
