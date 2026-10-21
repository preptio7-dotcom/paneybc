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
    const isSupported =
      typeof window !== 'undefined' &&
      (('serviceWorker' in navigator && 'PushManager' in window) || 'Notification' in window)
    setSupported(Boolean(isSupported))
  }, [])

  useEffect(() => {
    if (!supported) return
    const checkExisting = async () => {
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

        // If enabled previously in desktop app mode
        if (typeof window !== 'undefined' && localStorage.getItem('preptio_desktop_notifications_enabled') === 'true') {
          setIsEnabled(true)
          return
        }

        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready
          const existing = await registration.pushManager?.getSubscription?.()
          if (existing) {
            setIsEnabled(true)
          }
        }
      } catch (error) {
        console.warn('[notifications] Check existing subscription note:', error)
      }
    }

    void checkExisting()
  }, [supported])

  const handleEnable = async () => {
    try {
      setIsLoading(true)

      if (typeof Notification === 'undefined') {
        throw new Error('Notifications are not supported on this device.')
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Enable notifications in your system or browser settings to receive study alerts.',
          variant: 'destructive',
        })
        return
      }

      let subscribedViaPush = false
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      // Try service worker push manager subscription first (for standard web browsers)
      if ('serviceWorker' in navigator && 'PushManager' in window && publicKey) {
        try {
          const registration = await navigator.serviceWorker.ready
          let existing = null
          try {
            existing = await registration.pushManager?.getSubscription?.()
          } catch {
            // Push service check fallback
          }

          if (existing) {
            subscribedViaPush = true
          } else if (registration.pushManager?.subscribe) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            })

            const response = await fetch('/api/public/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription }),
            })

            if (response.ok) {
              subscribedViaPush = true
            }
          }
        } catch (pushErr: any) {
          console.warn(
            '[notifications] Remote PushManager subscription unavailable (e.g. desktop/packaged app). Falling back to Native Windows Desktop Notification mode:',
            pushErr?.message || pushErr
          )
        }
      }

      // Mark enabled locally so desktop app and browser keep the setting active
      if (typeof window !== 'undefined') {
        localStorage.setItem('preptio_desktop_notifications_enabled', 'true')
      }
      setIsEnabled(true)

      // Fire a test native notification on the desktop app so user confirms it works
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Preptio Notifications Active 🚀', {
            body: 'You are now set up to receive study alerts, mock exam reminders, and announcements on Windows.',
            icon: '/web-app-manifest-192x192.png',
          })
        }
      } catch (e) {
        console.warn('[notifications] Native notification dispatch error:', e)
      }

      toast({
        title: 'Notifications Enabled',
        description: subscribedViaPush
          ? 'You will receive review reminders and updates.'
          : 'Windows desktop notifications active.',
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
