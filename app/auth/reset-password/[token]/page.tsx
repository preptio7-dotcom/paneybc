'use client'

import React, { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const { toast } = useToast()
    const { user, loading } = useAuth()
    const router = useRouter()
    const { token } = useParams()

    useEffect(() => {
        if (loading) return
        if (user?.role == 'admin') {
            router.replace('/admin')
            return
        }
        if (user) {
            router.replace('/dashboard')
        }
    }, [loading, router, user])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            return toast({
                title: "Passwords do not match",
                description: "Please make sure both passwords are the same.",
                variant: "destructive",
            })
        }

        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to reset password')

            setIsSuccess(true)
            toast({
                title: "Success",
                description: "Your password has been reset successfully.",
            })

            // Redirect after 3 seconds
            setTimeout(() => {
                router.push('/auth/login')
            }, 3000)
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex flex-col">
                <Navigation />
                <div className="flex-grow flex items-center justify-center py-20 px-4">
                    <div className="animate-spin text-primary-green">Loading...</div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Navigation />

            <div className="flex-grow flex items-center justify-center py-20 px-4">
                <Card className="w-full max-w-md border-0 shadow-xl">
                    <CardHeader className="space-y-4 text-center">
                        <div className="mx-auto w-12 h-12 bg-primary-green/10 rounded-full flex items-center justify-center">
                            <ShieldCheck className="text-primary-green" size={24} />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black">Reset Password</CardTitle>
                            <CardDescription>
                                Secure your account by entering a new password below.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isSuccess ? (
                            <div className="space-y-6 text-center">
                                <p className="text-slate-600">
                                    Your password has been updated. You are being redirected to the login page...
                                </p>
                                <Link href="/auth/login" className="block">
                                    <Button className="w-full bg-primary-green hover:bg-primary-green/90">
                                        Back to Login
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="h-12 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="h-12"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-primary-green hover:bg-primary-green/90 font-bold"
                                    disabled={isLoading}
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Password
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Footer />
        </main>
    )
}
