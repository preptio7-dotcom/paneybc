import React, { Suspense } from 'react'
import BaeMockTestClient from './BaeMockTestClient'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-primary-green animate-spin" />
    </div>
  )
}

export default function BaeMockTestPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BaeMockTestClient />
    </Suspense>
  )
}
