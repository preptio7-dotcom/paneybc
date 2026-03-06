import { Suspense } from 'react'
import SubjectTestClient from './SubjectTestClient'

export default function SubjectTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin text-primary-green">Loading...</div>
        </div>
      }
    >
      <SubjectTestClient />
    </Suspense>
  )
}
