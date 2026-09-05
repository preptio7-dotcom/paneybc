'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PartyPopper, Instagram, Linkedin, Facebook } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function WelcomePopup() {
  const { user, loading, setUser } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    if (loading || !user) return

    // Do not show if admin or super_admin
    if (user.role === 'super_admin' || user.role === 'admin') return

    // Do not show if already dismissed
    if (user.popupDismissed) return

    // We can show it!
    setIsOpen(true)
  }, [user, loading])

  const handleDismiss = async () => {
    try {
      setIsDismissing(true)
      const response = await fetch('/api/user/welcome-popup/dismiss', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to dismiss popup')
      }

      setIsOpen(false)
      if (user) {
        setUser({ ...user, popupDismissed: true })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to dismiss welcome popup. Please try again.',
        variant: 'destructive',
      })
      setIsOpen(false) // Optimistically close it so they aren't blocked, but it might come back next login
    } finally {
      setIsDismissing(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0F7938]/10 mb-4">
            <PartyPopper className="h-8 w-8 text-[#0F7938]" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-slate-900">
            Assalamualaikum{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 pt-2 text-base">
            Welcome to Preptio — Pakistan's best free CA prep platform.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="h-px bg-slate-200 w-full mb-4" />
          
          <div className="mb-4 text-center">
            <h4 className="text-sm font-bold text-slate-800 mb-1">💬 Help us improve</h4>
            <p className="text-xs text-slate-500 mb-3">Got suggestions or found an issue? We'd love to hear from you.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              asChild
            >
              <a href="https://www.preptio.com/feedback" target="_blank" rel="noopener noreferrer">
                Give Feedback
              </a>
            </Button>
          </div>

          <div className="h-px bg-slate-200 w-full mb-4" />

          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-800 mb-3">📲 Follow our official handles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a href="https://x.com/PreptioOfficial" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> 
                @PreptioOfficial
              </a>
              <a href="https://www.instagram.com/preptio.official" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Instagram size={16} />
                @preptio.official
              </a>
              <a href="https://www.linkedin.com/company/preptio" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Linkedin size={16} />
                Preptio
              </a>
              <a href="https://www.facebook.com/share/p/1DNc73qUH9/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Facebook size={16} />
                Preptio
              </a>
            </div>
          </div>
          
          <div className="h-px bg-slate-200 w-full mt-4" />
        </div>

        <DialogFooter className="mt-0 flex flex-col gap-2 sm:flex-col sm:justify-center sm:space-x-0 w-full px-6 pb-6">
          <Button 
            className="w-full bg-[#0F7938] hover:bg-[#0F7938]/90 text-white" 
            onClick={() => setIsOpen(false)}
          >
            Got it, let's explore!
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            {isDismissing ? 'Dismissing...' : "Don't show this again"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
