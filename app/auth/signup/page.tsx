'use client'

import React, { useEffect, useState } from "react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SignupPage() {
  const { toast } = useToast()
  const { register, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    degree: 'CA',
    level: 'PRC',
    verificationCode: ''
  })

  useEffect(() => {
    if (loading) return
    if (!user) return
    const target = user.role === 'admin' ? '/admin' : '/dashboard'
    // Use a hard redirect to avoid client router getting stuck on auth pages.
    window.location.replace(target)
  }, [loading, user])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSelectChange = (field: 'degree' | 'level', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateStepOne = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      })
      return false
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleNext = async () => {
    if (step === 1 && !validateStepOne()) return

    if (step === 2 && (!formData.degree || !formData.level)) {
      toast({
        title: "Error",
        description: "Please select your degree and level",
        variant: "destructive"
      })
      return
    }

    if (step === 2) {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/signup/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send verification code')
        }

        toast({
          title: 'Verification sent',
          description: `A code has been sent to ${formData.email}.`,
        })

        setStep(3)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send verification code',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (step < 3) setStep(prev => prev + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(prev => prev - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStepOne()) return

    if (!formData.degree || !formData.level) {
      toast({
        title: "Error",
        description: "Please select your degree and level",
        variant: "destructive"
      })
      return
    }

    if (!formData.verificationCode || formData.verificationCode.trim().length < 4) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const verifyResponse = await fetch('/api/auth/signup/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: formData.verificationCode })
      })

      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Verification failed')
      }

      await register(formData.email, formData.password, formData.name, {
        degree: formData.degree,
        level: formData.level,
        verificationToken: verifyData.verificationToken,
      })

      toast({
        title: "Success",
        description: "Account created successfully. Redirecting...",
      })

      // Hard redirect to ensure navigation even if router state is stale.
      window.location.assign('/dashboard')
    } catch (error: any) {
      console.log("[v0] Signup error:", error)
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
                Create Account
              </CardTitle>
              <CardDescription className="text-center">
                Join Preptio and start studying
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                        required
                      />
                    </div>

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
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                        required
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Degree
                      </label>
                      <Select
                        value={formData.degree}
                        onValueChange={(value) => handleSelectChange('degree', value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]">
                          <SelectValue placeholder="Select degree" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">CA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Level
                      </label>
                      <Select
                        value={formData.level}
                        onValueChange={(value) => handleSelectChange('level', value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRC">PRC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                      We sent a verification code to <span className="font-semibold">{formData.email}</span>.
                      Enter it below to confirm your email.
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                        Verification Code
                      </label>
                      <Input
                        id="verificationCode"
                        name="verificationCode"
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter code"
                        value={formData.verificationCode}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isLoading}
                      className="w-full sm:flex-1 border-gray-200"
                    >
                      Back
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isLoading}
                      className="w-full sm:flex-1 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
                    >
                      {step === 2 ? 'Continue' : 'Next'}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:flex-1 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Create Account'}
                    </Button>
                  )}
                </div>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">Already have an account? </span>
                <Link href="/auth/login" className="text-[#0F7938] hover:underline font-semibold">
                  Login here
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
