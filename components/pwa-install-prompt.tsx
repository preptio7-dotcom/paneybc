'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share, MoreVertical, PlusSquare, Download, X } from 'lucide-react'

type OSType = 'ios' | 'android' | 'other'

export function PWAInstallPrompt() {
    const [isOpen, setIsOpen] = useState(false)
    const [os, setOs] = useState<OSType>('other')

    useEffect(() => {
        // 1. Detect OS and device type
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isMobile = /iphone|ipad|ipod|android|blackberry|iemobile|opera mini/.test(userAgent)

        if (!isMobile) return

        let detectedOs: OSType = 'other'
        if (/iphone|ipad|ipod/.test(userAgent)) {
            detectedOs = 'ios'
        } else if (/android/.test(userAgent)) {
            detectedOs = 'android'
        }
        setOs(detectedOs)

        // 2. Check if already installed or dismissed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const hasBeenDismissed = localStorage.getItem('pwa_prompt_dismissed')

        if (isStandalone || hasBeenDismissed) return

        // 3. Show prompt after 5 seconds
        const timer = setTimeout(() => {
            setIsOpen(true)
        }, 5000)

        return () => clearTimeout(timer)
    }, [])

    const handleDismiss = () => {
        localStorage.setItem('pwa_prompt_dismissed', 'true')
        setIsOpen(false)
    }

    if (os === 'other' && !isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px] rounded-[32px] p-6 border-0 shadow-2xl">
                <DialogHeader className="items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-primary-green/10 rounded-3xl flex items-center justify-center mb-2">
                        <Download size={40} className="text-primary-green" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-text-dark">
                        Install Preptio
                    </DialogTitle>
                    <DialogDescription className="text-text-light text-base leading-relaxed">
                        Get the best experience by adding our app to your home screen. It's fast, free, and gives you instant access!
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                            How to Install
                        </p>

                        {os === 'ios' ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                                        <Share size={18} className="text-blue-500" />
                                    </div>
                                    <p className="text-sm text-text-dark font-medium">
                                        1. Tap the <span className="font-bold underline text-blue-500">Share</span> button in Safari.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                                        <PlusSquare size={18} className="text-slate-700" />
                                    </div>
                                    <p className="text-sm text-text-dark font-medium">
                                        2. Scroll down and tap <span className="font-bold">Add to Home Screen</span>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                                        <MoreVertical size={18} className="text-slate-700" />
                                    </div>
                                    <p className="text-sm text-text-dark font-medium">
                                        1. Tap the <span className="font-bold">Menu</span> icon (three dots) in Chrome.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                                        <Download size={18} className="text-primary-green" />
                                    </div>
                                    <p className="text-sm text-text-dark font-medium">
                                        2. Tap <span className="font-bold">Install App</span> or <span className="font-bold">Add to Home Screen</span>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="sm:justify-center gap-3">
                    <Button
                        onClick={handleDismiss}
                        variant="ghost"
                        className="rounded-full text-slate-400 hover:text-slate-600 font-bold"
                    >
                        Not Now
                    </Button>
                    <Button
                        onClick={() => setIsOpen(false)}
                        className="bg-primary-green hover:bg-primary-green/90 rounded-full px-8 font-bold shadow-lg shadow-primary-green/20"
                    >
                        Got it!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
