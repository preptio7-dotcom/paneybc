import { Suspense } from 'react'
import ResultsClient from './ResultsClient'

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      }
    >
      <ResultsClient />
    </Suspense>
  )
}
