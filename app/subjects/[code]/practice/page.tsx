import { Suspense } from 'react'
import SubjectPracticeClient from './SubjectPracticeClient'

export default function SubjectPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      }
    >
      <SubjectPracticeClient />
    </Suspense>
  )
}
