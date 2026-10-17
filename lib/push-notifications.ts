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

/**
 * Nudges a user whose active streak is about to break (they practised
 * yesterday but not yet today). Returns true when at least one device accepted
 * the push, so the caller can decide whether to write a frequency-cap log.
 */
export async function sendStreakAtRiskPush(params: { userId: string; streak: number }): Promise<boolean> {
  const client = getWebPush()
  if (!client) return false

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: params.userId } })
  if (subscriptions.length === 0) return false

  const notificationPayload = JSON.stringify({
    title: `🔥 Keep your ${params.streak}-day streak alive!`,
    body: 'Practise a few questions before midnight to keep your streak going.',
    icon: '/web-app-manifest-512x512.png',
    badge: '/web-app-manifest-512x512.png',
    url: '/practice',
  })

  let anySent = false
  await Promise.all(
    subscriptions.map((sub) =>
      client
        .sendNotification(sub.subscription as any, notificationPayload)
        .then(() => {
          anySent = true
        })
        .catch((err: any) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            return prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
          console.error('Push error:', err)
        })
    )
  )

  return anySent
}
