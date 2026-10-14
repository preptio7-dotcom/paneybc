'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function NotificationOptIn() {
  const { toast } = useToast()
  const [supported, setSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(isSupported)
  }, [])

  useEffect(() => {
    if (!supported) return
    const checkExisting = async () => {
      try {
        if (Notification.permission !== 'granted') return
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          setIsEnabled(true)
        }
      } catch (error) {
        console.error('Failed to check push subscription:', error)
      }
    }

    checkExisting()
  }, [supported])

  const handleEnable = async () => {
    try {
      setIsLoading(true)
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Enable notifications in your browser settings to receive review reminders.',
          variant: 'destructive',
        })
        return
      }

      const registration = await navigator.serviceWorker.ready
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        throw new Error('VAPID public key is not configured')
      }

      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        setIsEnabled(true)
        toast({
          title: 'Notifications enabled',
          description: 'You are already subscribed.',
        })
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const response = await fetch('/api/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to subscribe')
      }

      setIsEnabled(true)
      toast({
        title: 'Notifications enabled',
        description: 'You will receive review reminders.',
      })
    } catch (error: any) {
      toast({
        title: 'Enable failed',
        description: error.message || 'Could not enable notifications.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!supported) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnable}
      disabled={isEnabled || isLoading}
    >
      {isEnabled ? 'Notifications Enabled' : isLoading ? 'Enabling...' : 'Enable Notifications'}
    </Button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
