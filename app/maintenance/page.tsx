'use client'

import React, { useState, useEffect } from 'react'
import { Construction, Loader2, Bell, CheckCircle2 } from 'lucide-react'

export default function Maintenance() {
    const [subscribed, setSubscribed] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [supported, setSupported] = useState(false)

    useEffect(() => {
        setSupported('serviceWorker' in navigator && 'PushManager' in window)
    }, [])

    const handleNotifyMe = async () => {
        if (!supported) {
            alert('Push notifications are not supported on this device')
            return
        }

        setSubscribing(true)
        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                alert('Please enable notifications to get notified when we\'re back!')
                setSubscribing(false)
                return
            }

            const registration = await navigator.serviceWorker.ready

            // Convert VAPID key from base64 to Uint8Array
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            console.log('VAPID Key available:', !!vapidPublicKey) // Debug log

            if (!vapidPublicKey) {
                console.error('VAPID Public Key is missing in environment variables')
                throw new Error('VAPID Public Key configuration missing')
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            })

            const response = await fetch('/api/public/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            })

            if (response.ok) {
                setSubscribed(true)
            } else {
                throw new Error('Subscription API failed')
            }
        } catch (error) {
            console.error('Subscription failed:', error)
            // @ts-ignore
            alert(`Failed to subscribe: ${error.message || 'Unknown error'}. Check console for details.`)
        } finally {
            setSubscribing(false)
        }
    }

    // Helper function to convert VAPID key
    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center">
                    <div className="p-6 bg-yellow-500/10 rounded-full border border-yellow-500/20 animate-pulse">
                        <Construction className="text-yellow-500" size={64} />
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-white tracking-tight">
                    Under Maintenance
                </h1>

                <p className="text-gray-400 text-lg leading-relaxed">
                    We're currently performing some scheduled maintenance to improve your experience.
                    We'll be back online shortly.
                </p>

                <div className="flex items-center justify-center gap-2 text-primary-green">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="font-medium">System Upgrade in Progress</span>
                </div>

                {supported && !subscribed && (
                    <button
                        onClick={handleNotifyMe}
                        disabled={subscribing}
                        className="mt-8 px-6 py-3 bg-primary-green hover:bg-primary-green/90 text-black font-semibold rounded-xl flex items-center gap-2 mx-auto transition-all shadow-lg disabled:opacity-50"
                    >
                        {subscribing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Subscribing...
                            </>
                        ) : (
                            <>
                                <Bell size={20} />
                                Notify Me When Back
                            </>
                        )}
                    </button>
                )}

                {subscribed && (
                    <div className="mt-8 px-6 py-3 bg-green-500/10 border border-green-500/20 text-green-500 font-semibold rounded-xl flex items-center gap-2 mx-auto">
                        <CheckCircle2 size={20} />
                        You'll be notified when we're back!
                    </div>
                )}
            </div>
        </div>
    )
}
