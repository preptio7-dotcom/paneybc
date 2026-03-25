import { Suspense } from 'react'
import WrongAnswersTestClient from './WrongAnswersTestClient'

export default function WrongAnswersTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      }
    >
      <WrongAnswersTestClient />
    </Suspense>
  )
}
