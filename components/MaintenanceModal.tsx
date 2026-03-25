'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, ShieldAlert, CheckCircle2, Construction, X } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface MaintenanceModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (enabled: boolean) => Promise<void>
    isCurrentlyEnabled: boolean
}

export function MaintenanceModal({ isOpen, onClose, onConfirm, isCurrentlyEnabled }: MaintenanceModalProps) {
    const [step, setStep] = useState(1)
    const [confirmedImpact, setConfirmedImpact] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleConfirm = async () => {
        setIsSubmitting(true)
        try {
            await onConfirm(!isCurrentlyEnabled)
            onClose()
            // Reset state
            setTimeout(() => {
                setStep(1)
                setConfirmedImpact(false)
            }, 300)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetAndClose = () => {
        onClose()
        setTimeout(() => {
            setStep(1)
            setConfirmedImpact(false)
        }, 300)
    }

    return (
        <Dialog open={isOpen} onOpenChange={resetAndClose}>
            <DialogContent className="sm:max-w-[450px] bg-gray-950 border-gray-800 text-white rounded-2xl overflow-hidden p-0">
                <div className="absolute right-4 top-4 z-10">
                    <button onClick={resetAndClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className={`p-8 transition-all duration-300 ${step === 1 ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 hidden'}`}>
                    <div className="flex justify-center mb-6">
                        <div className={`p-4 rounded-full ${isCurrentlyEnabled ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                            {isCurrentlyEnabled ? (
                                <CheckCircle2 className="text-green-500" size={48} />
                            ) : (
                                <ShieldAlert className="text-red-500" size={48} />
                            )}
                        </div>
                    </div>

                    <DialogHeader className="text-center space-y-4">
                        <DialogTitle className="text-2xl font-bold">
                            {isCurrentlyEnabled ? 'Restore Platform Access?' : 'Emergency Deactivation'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400 text-base leading-relaxed">
                            {isCurrentlyEnabled
                                ? 'You are about to bring the Preptio back online. All students and users will regain immediate access to their dashboards and exams.'
                                : 'Activating Maintenance Mode will immediately disconnect all active students and block site access. Only Super Admins will be able to bypass the block.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {!isCurrentlyEnabled && (
                        <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800 flex items-start gap-4">
                            <input
                                type="checkbox"
                                id="impact-confirm"
                                checked={confirmedImpact}
                                onChange={(e) => setConfirmedImpact(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-gray-700 bg-gray-800 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <Label htmlFor="impact-confirm" className="text-sm text-gray-400 leading-snug cursor-pointer font-normal select-none">
                                I understand this will immediately prevent students from completing their ongoing timed exams.
                            </Label>
                        </div>
                    )}

                    <div className="mt-8 flex flex-col gap-3">
                        <Button
                            className={`w-full py-6 text-base font-bold transition-all rounded-xl shadow-lg ${isCurrentlyEnabled
                                ? 'bg-primary-green hover:bg-primary-green/90 text-black'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            disabled={!isCurrentlyEnabled && !confirmedImpact}
                            onClick={() => setStep(2)}
                        >
                            Next Step
                        </Button>
                        <Button variant="ghost" onClick={resetAndClose} className="text-gray-500 hover:text-white hover:bg-white/5 py-6">
                            Keep Current State
                        </Button>
                    </div>
                </div>

                <div className={`p-8 transition-all duration-300 ${step === 2 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 hidden'}`}>
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-yellow-500/10 rounded-full border border-yellow-500/20 animate-pulse">
                            <Construction className="text-yellow-500" size={48} />
                        </div>
                    </div>

                    <DialogHeader className="text-center space-y-4">
                        <DialogTitle className="text-2xl font-bold">Account Verification</DialogTitle>
                        <DialogDescription className="text-gray-400 text-base">
                            You are about to commit a system-wide state change. Please confirm this action.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-8 flex flex-col gap-3">
                        <Button
                            className={`w-full py-6 text-base font-bold transition-all rounded-xl shadow-lg border-2 ${isCurrentlyEnabled
                                ? 'bg-green-600 border-green-500 hover:bg-green-700'
                                : 'bg-red-600 border-red-500 hover:bg-red-700'
                                }`}
                            disabled={isSubmitting}
                            onClick={handleConfirm}
                        >
                            {isSubmitting ? 'Processing...' : (isCurrentlyEnabled ? 'Confirm Activation (Live)' : 'Confirm Shutdown (Maintenance)')}
                        </Button>
                        <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting} className="text-gray-500 hover:text-white hover:bg-white/5 py-6">
                            Back
                        </Button>
                    </div>

                    <div className="mt-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">
                            Admin Action ID: {Math.random().toString(36).substring(7).toUpperCase()}
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
