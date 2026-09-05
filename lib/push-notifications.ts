import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// VAPID keys should ideally be in env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

webpush.setVapidDetails(
    'mailto:support@preptio.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
)

export async function broadcastBackOnline() {
    const subscriptions = await prisma.pushSubscription.findMany()

    const notificationPayload = JSON.stringify({
        title: 'Platform is Back Online! 🚀',
        body: 'Maintenance is complete. You can now resume your studies and timed exams.',
        icon: '/web-app-manifest-512x512.png',
        badge: '/web-app-manifest-512x512.png',
        url: '/dashboard'
    })

    const sendPromises = subscriptions.map(sub => {
        return webpush.sendNotification(sub.subscription as any, notificationPayload)
            .catch((err: any) => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Subscription has expired or is no longer valid
                    return prisma.pushSubscription.delete({ where: { id: sub.id } })
                }
                console.error('Push error:', err)
            })
    })

    await Promise.all(sendPromises)

    // Optional: Clear subscriptions after broadcast since it's a one-time event
    // await PushSubscription.deleteMany({})
}

export async function sendReviewDuePush(params: {
    userId: string
    dueCount: number
}) {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: params.userId } })

    if (subscriptions.length === 0) return

    const notificationPayload = JSON.stringify({
        title: 'Review Due ⏳',
        body: `You have ${params.dueCount} questions ready for spaced repetition.`,
        icon: '/web-app-manifest-512x512.png',
        badge: '/web-app-manifest-512x512.png',
        url: '/review'
    })

    const sendPromises = subscriptions.map(sub => {
        return webpush.sendNotification(sub.subscription as any, notificationPayload)
            .catch((err: any) => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    return prisma.pushSubscription.delete({ where: { id: sub.id } })
                }
                console.error('Push error:', err)
            })
    })

    await Promise.all(sendPromises)
}
