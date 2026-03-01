import { Navigation } from '@/components/navigation'
import { LogoutToast } from '@/components/logout-toast'
import { HomepageContent } from '@/components/homepage-content'
import { Suspense } from 'react'

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
