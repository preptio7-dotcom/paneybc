import React from "react"
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import Script from 'next/script'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'

import { AuthProvider } from '@/lib/auth-context'

import { Inter, Poppins, Geist as V0_Font_Geist, Geist_Mono as V0_Font_Geist_Mono, Source_Serif_4 as V0_Font_Source_Serif_4 } from 'next/font/google'

// Initialize fonts
const _geist = V0_Font_Geist({ subsets: ['latin'], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] })
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] })
const _sourceSerif_4 = V0_Font_Source_Serif_4({ subsets: ['latin'], weight: ["200", "300", "400", "500", "600", "700", "800", "900"] })

// Initialize fonts for Preptio
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700']
})

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700']
})

const appUrlValue = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const resolvedAppUrl = appUrlValue.startsWith('http') ? appUrlValue : `https://${appUrlValue}`

export const metadata: Metadata = {
  metadataBase: new URL(resolvedAppUrl),
  title: {
    default: 'Preptio - Master Your CA Exams',
    template: '%s | Preptio'
  },
  description: 'Practice with 2000+ real exam questions, take timed tests, and track your progress. Master your CA exams with confidence.',
  keywords: ['CA', 'CA', 'Practice Platform', 'MCQs', 'Chartered Accountant', 'Exams', 'Pakistan'],
  authors: [{ name: 'Preptio Team' }],
  creator: 'Preptio',
  publisher: 'Preptio',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Preptio',
    startupImage: [
      '/web-app-manifest-512x512.png',
    ],
  },
  icons: {
    icon: [
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://preptio.com',
    title: 'Preptio - Master Your Exams',
    description: 'The ultimate preparation platform for CA students. 2000+ verified MCQs and real-time mock tests.',
    siteName: 'Preptio',
    images: [
      {
        url: '/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: 'Preptio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Preptio - Master Your Exams',
    description: 'The ultimate preparation platform for CA students. 2000+ verified MCQs and real-time mock tests.',
    creator: '@preptio',
    images: ['/web-app-manifest-512x512.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
}

import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { PWARegistration } from "@/components/pwa-registration"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { AnalyticsTracker } from "@/components/analytics-tracker"
import { ContactPopup } from "@/components/contact-popup"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X801R2C3NS"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-X801R2C3NS');
          `}
        </Script>
        <AuthProvider>
          <PWARegistration />
          <PWAInstallPrompt />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
          <ContactPopup />
        </AuthProvider>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
