'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Shield, Mail, Lock, Key, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

const otpSchema = z.object({
    code: z.string().length(6, 'OTP must be 6 digits'),
})

type LoginData = z.infer<typeof loginSchema>
type OTPData = z.infer<typeof otpSchema>

export default function SuperAdminLoginPage() {
    const [step, setStep] = useState<'login' | 'otp'>('login')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const {
        register: registerLogin,
        handleSubmit: handleSubmitLogin,
        formState: { errors: loginErrors },
    } = useForm<LoginData>({
        resolver: zodResolver(loginSchema),
    })

    const {
        register: registerOTP,
        handleSubmit: handleSubmitOTP,
        formState: { errors: otpErrors },
    } = useForm<OTPData>({
        resolver: zodResolver(otpSchema),
    })

    const onLoginSubmit = async (data: LoginData) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/super-admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (response.ok) {
                setEmail(data.email)
                setStep('otp')
                toast.success('OTP Sent', {
                    description: 'A 6-digit code has been sent to your email.',
                })
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Login failed')
            }
        } catch (error: any) {
            toast.error('Login error', {
                description: error.message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    const onOTPSubmit = async (data: OTPData) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/super-admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: data.code }),
            })

            if (response.ok) {
                toast.success('Verified!', {
                    description: 'Welcome to the Super Admin Dashboard.',
                })
                router.push('/sKy9108-3~620_admin!/dashboard')
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Verification failed')
            }
        } catch (error: any) {
            toast.error('Verification error', {
                description: error.message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-primary-green/20 rounded-2xl flex items-center justify-center mb-4 border border-primary-green/30">
                            <Shield className="text-primary-green" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Super Admin Access</h1>
                        <p className="text-gray-400 text-sm mt-2">Secure gateway for CA management</p>
                    </div>

                    {step === 'login' ? (
                        <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
                                    <Mail size={16} />
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ali.mahesar04@gmail.com"
                                    {...registerLogin('email')}
                                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-primary-green"
                                />
                                {loginErrors.email && <p className="text-xs text-red-500 mt-1">{loginErrors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                                    <Lock size={16} />
                                    Password
                                </Label>
                                <div className="relative group">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="********"
                                        {...registerLogin('password')}
                                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-primary-green pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {loginErrors.password && <p className="text-xs text-red-500 mt-1">{loginErrors.password.message}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold rounded-xl"
                            >
                                {isLoading ? 'Processing...' : 'Request Verification Code'}
                            </Button>
                            <Link href="/contact" className="block">
                                <Button variant="outline" className="w-full border-gray-700 text-gray-200">
                                    Contact Support
                                </Button>
                            </Link>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitOTP(onOTPSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="code" className="text-gray-300 flex items-center gap-2">
                                    <Key size={16} />
                                    Enter 6-Digit Code
                                </Label>
                                <Input
                                    id="code"
                                    placeholder="000000"
                                    maxLength={6}
                                    {...registerOTP('code')}
                                    className="bg-gray-800 border-gray-700 text-white text-center text-2xl tracking-widest placeholder:text-gray-600 focus:ring-primary-green"
                                />
                                {otpErrors.code && <p className="text-xs text-red-500 mt-1">{otpErrors.code.message}</p>}
                                <p className="text-xs text-gray-500 text-center mt-4">
                                    Sent to <span className="text-gray-300">{email}</span>
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-primary-green hover:bg-primary-green/90 text-gray-950 font-bold rounded-xl"
                            >
                                {isLoading ? 'Verifying...' : 'Verify & Login'}
                            </Button>
                            <Link href="/contact" className="block">
                                <Button variant="outline" className="w-full border-gray-700 text-gray-200">
                                    Contact Support
                                </Button>
                            </Link>

                            <button
                                type="button"
                                onClick={() => setStep('login')}
                                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Back to email login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div >
    )
}
