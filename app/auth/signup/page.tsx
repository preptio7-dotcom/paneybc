'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star } from 'lucide-react'
import { normalizePkPhone } from '@/lib/account-utils'

type RegistrationOptions = {
  degrees: string[]
  levels: string[]
}

const fallbackOptions: RegistrationOptions = {
  degrees: ['CA'],
  levels: ['PRC', 'CAF'],
}

export default function SignupPage() {
  const { toast } = useToast()
  const { register, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [step, setStep] = useState(1)
  const [registrationOptions, setRegistrationOptions] = useState<RegistrationOptions>(fallbackOptions)
  const [formStartedAt] = useState(() => Date.now())
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    degree: fallbackOptions.degrees[0],
    level: fallbackOptions.levels[0],
    institute: '',
    city: '',
    studentId: '',
    instituteRating: 0,
    acceptTerms: false,
    verificationCode: '',
    website: '',
  })

  useEffect(() => {
    if (loading) return
    if (!user) return
    const target = user.role === 'admin' ? '/admin' : '/dashboard'
    window.location.replace(target)
  }, [loading, user])

  useEffect(() => {
    const loadRegistrationOptions = async () => {
      try {
        setIsLoadingOptions(true)
        const response = await fetch('/api/public/settings')
        if (!response.ok) return
        const data = await response.json()
        const degrees = Array.isArray(data?.testSettings?.registrationDegrees)
          ? data.testSettings.registrationDegrees.map((item: string) => String(item).trim()).filter(Boolean)
          : fallbackOptions.degrees
        const levels = Array.isArray(data?.testSettings?.registrationLevels)
          ? data.testSettings.registrationLevels.map((item: string) => String(item).trim()).filter(Boolean)
          : fallbackOptions.levels

        const nextOptions = {
          degrees: degrees.length ? degrees : fallbackOptions.degrees,
          levels: levels.length ? levels : fallbackOptions.levels,
        }
        setRegistrationOptions(nextOptions)
        setFormData((prev) => ({
          ...prev,
          degree: nextOptions.degrees.includes(prev.degree) ? prev.degree : nextOptions.degrees[0],
          level: nextOptions.levels.includes(prev.level) ? prev.level : nextOptions.levels[0],
        }))
      } catch {
        // keep defaults
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadRegistrationOptions()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSelectChange = (field: 'degree' | 'level', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateStepOne = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password || !formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return false
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      })
      return false
    }

    if (!normalizePkPhone(formData.phone)) {
      toast({
        title: 'Error',
        description: 'The number you entered is wrong. Use a valid Pakistani mobile number.',
        variant: 'destructive',
      })
      return false
    }

    if (!formData.acceptTerms) {
      toast({
        title: 'Error',
        description: 'Please accept the terms and conditions to continue.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const validateStepTwo = () => {
    if (
      !formData.degree ||
      !formData.level ||
      !formData.institute.trim() ||
      !formData.city.trim() ||
      !formData.studentId.trim()
    ) {
      toast({
        title: 'Error',
        description: 'Please complete degree, level, institute, city, and student ID.',
        variant: 'destructive',
      })
      return false
    }
    if (!formData.instituteRating || formData.instituteRating < 1 || formData.instituteRating > 5) {
      toast({
        title: 'Error',
        description: 'Please rate your institute from 1 to 5 stars.',
        variant: 'destructive',
      })
      return false
    }
    return true
  }

  const handleNext = async () => {
    if (step === 1 && !validateStepOne()) return
    if (step === 2 && !validateStepTwo()) return

    if (step === 2) {
      setIsLoading(true)
      try {
        const response = await fetch('/api/auth/signup/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email.trim() }),
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
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (step < 3) setStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStepOne() || !validateStepTwo()) return
    if (!formData.verificationCode || formData.verificationCode.trim().length < 4) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const verifyResponse = await fetch('/api/auth/signup/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), code: formData.verificationCode }),
      })

      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Verification failed')
      }

      await register(formData.email.trim(), formData.password, formData.name.trim(), {
        degree: formData.degree,
        level: formData.level,
        institute: formData.institute.trim(),
        city: formData.city.trim(),
        studentId: formData.studentId.trim(),
        phone: formData.phone.trim(),
        instituteRating: formData.instituteRating,
        acceptedTerms: formData.acceptTerms,
        verificationToken: verifyData.verificationToken,
        website: formData.website,
        startedAt: formStartedAt,
      })

      toast({
        title: 'Success',
        description: 'Account created successfully. Redirecting...',
      })

      window.location.assign('/dashboard')
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

  const termsNote = useMemo(
    () =>
      'I confirm all details are accurate. I understand this phone number may be used to add me to official WhatsApp groups/channels. If my student ID or any provided detail is incorrect, my account can be permanently banned.',
    []
  )

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 pt-[90px] pb-8">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 pt-[90px] pb-8">
        <div className="w-full max-w-xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-[#0F7938]">Create Account</CardTitle>
              <CardDescription className="text-center">Join Preptio and start studying</CardDescription>
              <p className="text-center text-xs text-slate-500">Step {step} of 3</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  autoComplete="off"
                  tabIndex={-1}
                  className="hidden"
                  aria-hidden="true"
                />

                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor="name" className="text-sm font-medium text-gray-700">
                          Full Name *
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
                          Email Address *
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
                        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                          Pakistani Phone Number *
                        </label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+923001234567 or 03001234567"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-gray-700">
                          Password *
                        </label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Minimum 8 characters"
                          value={formData.password}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                          Confirm Password *
                        </label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                          required
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          name="acceptTerms"
                          checked={formData.acceptTerms}
                          onChange={handleChange}
                          className="mt-1"
                          required
                        />
                        <span>
                          {termsNote}{' '}
                          <Link href="/terms" className="text-[#0F7938] font-semibold hover:underline">
                            Read Terms
                          </Link>
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Degree *</label>
                        <Select
                          value={formData.degree}
                          onValueChange={(value) => handleSelectChange('degree', value)}
                          disabled={isLoading || isLoadingOptions}
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]">
                            <SelectValue placeholder="Select degree" />
                          </SelectTrigger>
                          <SelectContent>
                            {registrationOptions.degrees.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Level *</label>
                        <Select
                          value={formData.level}
                          onValueChange={(value) => handleSelectChange('level', value)}
                          disabled={isLoading || isLoadingOptions}
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            {registrationOptions.levels.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label htmlFor="institute" className="text-sm font-medium text-gray-700">
                          Institute *
                        </label>
                        <Input
                          id="institute"
                          name="institute"
                          type="text"
                          placeholder="Your institute name"
                          value={formData.institute}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="city" className="text-sm font-medium text-gray-700">
                          City *
                        </label>
                        <Input
                          id="city"
                          name="city"
                          type="text"
                          placeholder="City"
                          value={formData.city}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="studentId" className="text-sm font-medium text-gray-700">
                          Student ID *
                        </label>
                        <Input
                          id="studentId"
                          name="studentId"
                          type="text"
                          placeholder="Institute student ID"
                          value={formData.studentId}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="border-gray-200 focus:border-[#0F7938] focus:ring-[#0F7938]"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Rate Your Institute *</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, instituteRating: star }))}
                            className="p-1"
                            aria-label={`Rate ${star} star`}
                          >
                            <Star
                              size={20}
                              className={star <= formData.instituteRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                            />
                          </button>
                        ))}
                        <span className="text-xs text-slate-500">
                          {formData.instituteRating ? `${formData.instituteRating}/5` : 'Select rating'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                      We sent a verification code to <span className="font-semibold">{formData.email}</span>. Enter it below to confirm your email.
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                        Verification Code *
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
                      disabled={isLoading || (step === 2 && isLoadingOptions)}
                      className="w-full sm:flex-1 bg-[#0F7938] hover:bg-[#0F7938]/90 text-white"
                    >
                      {step === 2 ? 'Send Verification Code' : 'Next'}
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
