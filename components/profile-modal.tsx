'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User as UserIcon, Check } from 'lucide-react'
import Image from 'next/image'

const avatars = [
    { id: 'boy_1', path: '/avatars/boy_1.png', gender: 'boy' },
    { id: 'boy_2', path: '/avatars/boy_2.png', gender: 'boy' },
    { id: 'boy_3', path: '/avatars/boy_3.png', gender: 'boy' },
    { id: 'girl_1', path: '/avatars/girl_1.png', gender: 'girl' },
    { id: 'girl_2', path: '/avatars/girl_2.png', gender: 'girl' },
    { id: 'girl_3', path: '/avatars/girl_3.png', gender: 'girl' },
]

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, setUser } = useAuth()
    const { toast } = useToast()
    const [name, setName] = useState(user?.name || '')
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '/avatars/boy_1.png')
    const [isLoading, setIsLoading] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    useEffect(() => {
        if (user) {
            setName(user.name)
            setSelectedAvatar(user.avatar || '/avatars/boy_1.png')
        }
    }, [user, isOpen])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, avatar: selectedAvatar }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to update profile')

            setUser(data.user)
            toast({
                title: "Profile Updated",
                description: "Your profile has been successfully updated.",
            })
            onClose()
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

    const handleForgotPassword = async () => {
        try {
            setIsResetting(true)
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user?.email }),
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to initiate password reset')

            toast({
                title: "Reset Link Sent",
                description: "A password reset link has been sent to your email.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Personalize your account and manage your password.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdateProfile} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <Label>Select Your Avatar</Label>
                        <div className="grid grid-cols-3 gap-4">
                            {avatars.map((avatar) => (
                                <div
                                    key={avatar.id}
                                    onClick={() => setSelectedAvatar(avatar.path)}
                                    className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all ${selectedAvatar === avatar.path
                                        ? 'border-primary-green scale-105 shadow-md'
                                        : 'border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <Image
                                        src={avatar.path}
                                        alt={avatar.id}
                                        fill
                                        className="object-cover"
                                    />
                                    {selectedAvatar === avatar.path && (
                                        <div className="absolute inset-0 bg-primary-green/20 flex items-center justify-center">
                                            <div className="bg-primary-green text-white rounded-full p-1">
                                                <Check size={16} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                type="email"
                                id="email"
                                value={user?.email || ''}
                                disabled
                                className="bg-slate-50 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Reset Password</Label>
                                <p className="text-xs text-slate-500">Security link will be sent to your email.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleForgotPassword}
                                disabled={isResetting}
                            >
                                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Link
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-primary-green hover:bg-primary-green/90">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
