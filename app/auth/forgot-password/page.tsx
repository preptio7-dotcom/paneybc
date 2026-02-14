'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isEmailSent, setIsEmailSent] = useState(false)
    const { toast } = useToast()
    const { user, loading } = useAuth()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to send reset link')

            setIsEmailSent(true)
            toast({
                title: "Reset link sent",
                description: "If an account exists with this email, you will receive a reset link.",
            })
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
                            <Mail className="text-primary-green" size={24} />
                        </div>
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black">Forgot Password?</CardTitle>
                            <CardDescription>
                                No worries! Enter your email and we'll send you a link to reset your password.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isEmailSent ? (
                            <div className="space-y-6 text-center">
                                <p className="text-slate-600">
                                    A password reset link has been sent to <strong>{email}</strong>.
                                    Please check your inbox (and spam folder).
                                </p>
                                <Link href="/auth/login" className="block">
                                    <Button className="w-full bg-primary-green hover:bg-primary-green/90">
                                        Back to Login
                                    </Button>
                                </Link>
                                <button
                                    onClick={() => setIsEmailSent(false)}
                                    className="text-sm font-bold text-primary-green hover:underline"
                                >
                                    Didn't get the email? Try again
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                    Send Reset Link
                                </Button>
                                <Link href="/auth/login" className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-text-dark transition-colors">
                                    <ArrowLeft size={16} />
                                    Back to login
                                </Link>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Footer />
        </main>
    )
}
