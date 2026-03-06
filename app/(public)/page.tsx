import { Navigation } from '@/components/navigation'
import { LogoutToast } from '@/components/logout-toast'
import { HomepageContent } from '@/components/homepage-content'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'

export async function generateMetadata() {
  let questionCount = 4000

  try {
    const count = await prisma.question.count()
    if (count > 0) {
      questionCount = count
    }
  } catch (e) {
    // fallback to hardcoded default
    questionCount = 4000
  }

  // Round down to nearest 500
  // for cleaner display
  // e.g. 4,243 becomes "4,000+"
  // e.g. 4,600 becomes "4,500+"
  const rounded = Math.floor(questionCount / 500) * 500

  return {
    title: 'Preptio — Free CA Foundation Exam Prep for ICAP Students',
    description: `Practice with ${rounded}+ ICAP-aligned MCQs, timed mock exams, and readiness tracking on Pakistan's free CA Foundation prep platform at preptio.com.`,
    openGraph: {
      title: 'Preptio — Free CA Foundation Exam Prep for ICAP Students',
      description: `Practice with ${rounded}+ ICAP-aligned MCQs, attempt timed mock exams, and track your exam readiness score. Pakistan's free CA Foundation prep platform — completely free.`,
      url: 'https://www.preptio.com',
      siteName: 'Preptio',
      images: [
        {
          url: 'https://www.preptio.com/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Preptio — Free CA Foundation Exam Prep',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@PreptioOfficial',
      title: 'Preptio — Free CA Foundation Exam Prep for ICAP Students',
      description: `Practice with ${rounded}+ ICAP-aligned MCQs, attempt timed mock exams, and track your exam readiness score. Completely free.`,
      images: ['https://www.preptio.com/og-image.png'],
    },
    alternates: {
      canonical: 'https://www.preptio.com',
    },
  }
}

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
