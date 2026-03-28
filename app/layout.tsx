import React from "react"
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'

import { AuthProvider } from '@/lib/auth-context'
import {
  PREPTIO_DEFAULT_OG_IMAGE_URL,
  PREPTIO_SITE_URL,
  PREPTIO_TWITTER_SITE,
} from '@/lib/seo'

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

const defaultTitle = 'Preptio - Free CA Foundation Exam Prep for ICAP Students Pakistan'
const defaultDescription =
  "Pakistan's free CA Foundation exam prep platform. 4,000+ ICAP-aligned MCQs, mock tests, analytics - completely free. Start at preptio.com"
const enableVercelTelemetry = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV)

export const metadata: Metadata = {
  metadataBase: new URL(PREPTIO_SITE_URL),
  title: defaultTitle,
  description: defaultDescription,
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
    url: PREPTIO_SITE_URL,
    title: defaultTitle,
    description: defaultDescription,
    siteName: 'Preptio',
    images: [
      {
        url: PREPTIO_DEFAULT_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: defaultTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: PREPTIO_TWITTER_SITE,
    title: defaultTitle,
    description: defaultDescription,
    images: [PREPTIO_DEFAULT_OG_IMAGE_URL],
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
import { TrustedTypesBootstrap } from "@/components/trusted-types-bootstrap"
import { GlobalRuntimeMonitor } from "@/components/global-runtime-monitor"
import { DeferredGtag } from "@/components/deferred-gtag"
import { WelcomePopup } from "@/components/welcome-popup"

import Script from 'next/script'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              '*,::before,::after{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:var(--font-sans),system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100%}main{display:block}img{max-width:100%;height:auto}nav{position:sticky;top:0;left:0;right:0;z-index:1000}.hero-section-root{position:relative;width:100%;overflow:hidden;padding-top:86px;padding-bottom:48px}@media (min-width:768px){.hero-section-root{padding-bottom:72px}}@media (min-width:1024px){.hero-section-root{padding-bottom:96px}}',
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://api.dicebear.com" />
        <link rel="dns-prefetch" href="https://api.multiavatar.com" />
        <link rel="dns-prefetch" href="https://models.readyplayer.me" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html:
              '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "vrvnjfsfpv");',
          }}
        />
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <TrustedTypesBootstrap />
        <DeferredGtag />
        <AuthProvider>
          <PWARegistration />
          <PWAInstallPrompt />
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <GlobalRuntimeMonitor />
          {children}
          <ContactPopup />
          <WelcomePopup />


        </AuthProvider>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
        {enableVercelTelemetry ? <Analytics /> : null}
        {enableVercelTelemetry ? <SpeedInsights /> : null}
      </body>
    </html>
  )
}
