import { Navigation } from '@/components/navigation'
import { LogoutToast } from '@/components/logout-toast'
import { HomepageContent } from '@/components/homepage-content'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Preptio - Free CA Foundation Exam Prep for ICAP Students Pakistan',
  description:
    "Pakistan's free CA Foundation exam prep platform. 4,000+ ICAP-aligned MCQs, mock tests, analytics - completely free. Start at preptio.com",
  path: '/',
})

export default function Home() {
  return (
    <main className="w-full">
      <Navigation />
      <Suspense fallback={null}>
        <LogoutToast />
      </Suspense>
      <HomepageContent />
    </main>
  )
}
