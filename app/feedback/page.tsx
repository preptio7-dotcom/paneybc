import { Suspense } from 'react'
import FeedbackClient from './FeedbackClient'

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      }
    >
      <FeedbackClient />
    </Suspense>
  )
}
