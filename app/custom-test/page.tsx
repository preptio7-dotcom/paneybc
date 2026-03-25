import { Suspense } from 'react'
import CustomTestClient from './CustomTestClient'

export default function CustomTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      }
    >
      <CustomTestClient />
    </Suspense>
  )
}
