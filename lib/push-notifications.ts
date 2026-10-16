import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// VAPID configuration is read lazily. Reading env vars and calling
// setVapidDetails at module load made `next build` crash whenever the keys
// were absent at build time (page-data collection imports every route).
let vapidConfigured = false

function getWebPush(): typeof webpush | null {
  if (vapidConfigured) return webpush

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys are not configured; push notifications are skipped')
    return null
  }

  webpush.setVapidDetails('mailto:support@preptio.com', publicKey, privateKey)
  vapidConfigured = true
  return webpush
}

export async function broadcastBackOnline() {
  const client = getWebPush()
  if (!client) return

  const subscriptions = await prisma.pushSubscription.findMany()

  const notificationPayload = JSON.stringify({
    title: 'Platform is Back Online! 🚀',
    body: 'Maintenance is complete. You can now resume your studies and timed exams.',
    icon: '/web-app-manifest-512x512.png',
    badge: '/web-app-manifest-512x512.png',
    url: '/dashboard',
  })

  const sendPromises = subscriptions.map((sub) =>
    client.sendNotification(sub.subscription as any, notificationPayload).catch((err: any) => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Subscription has expired or is no longer valid
        return prisma.pushSubscription.delete({ where: { id: sub.id } })
      }
      console.error('Push error:', err)
    })
  )

  await Promise.all(sendPromises)
}

export async function sendReviewDuePush(params: { userId: string; dueCount: number }) {
  const client = getWebPush()
  if (!client) return

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: params.userId } })
  if (subscriptions.length === 0) return

  const notificationPayload = JSON.stringify({
    title: 'Review Due ⏳',
    body: `You have ${params.dueCount} questions ready for spaced repetition.`,
    icon: '/web-app-manifest-512x512.png',
    badge: '/web-app-manifest-512x512.png',
    url: '/review',
  })

  const sendPromises = subscriptions.map((sub) =>
    client.sendNotification(sub.subscription as any, notificationPayload).catch((err: any) => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        return prisma.pushSubscription.delete({ where: { id: sub.id } })
      }
      console.error('Push error:', err)
    })
  )

  await Promise.all(sendPromises)
}
