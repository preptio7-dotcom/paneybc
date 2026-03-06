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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://www.preptio.com/#website',
        url: 'https://www.preptio.com',
        name: 'Preptio',
        description: "Pakistan's free CA Foundation exam preparation platform for ICAP students",
        publisher: {
          '@id': 'https://www.preptio.com/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://www.preptio.com/blog?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://www.preptio.com/#organization',
        name: 'Preptio',
        url: 'https://www.preptio.com',
        logo: 'https://www.preptio.com/logo.png',
        description: "Pakistan's free CA Foundation exam preparation platform built for ICAP students",
        foundingDate: '2025',
        foundingLocation: 'Pakistan',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@preptio.com',
          availableLanguage: ['English', 'Urdu'],
        },
        sameAs: [
          'https://www.instagram.com/preptio.official',
          'https://x.com/PreptioOfficial',
          'https://www.linkedin.com/company/preptio',
          'https://www.facebook.com/share/p/1DNc73qUH9/',
        ],
      },
      {
        '@type': 'EducationalOrganization',
        name: 'Preptio',
        url: 'https://www.preptio.com',
        description: 'Free CA Foundation MCQ practice platform for ICAP students in Pakistan',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'CA Foundation Exam Preparation',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Course',
                name: 'CA Foundation MCQ Practice',
                description: '4000+ ICAP-aligned MCQs for CA Foundation subjects',
                provider: {
                  '@type': 'Organization',
                  name: 'Preptio',
                },
                educationalLevel: 'CA Foundation',
                about: 'ICAP CA Foundation Exam',
                inLanguage: 'English',
                isAccessibleForFree: true,
                hasCourseInstance: [
                  {
                    '@type': 'CourseInstance',
                    name: 'FOA Practice',
                    courseMode: 'online',
                  },
                  {
                    '@type': 'CourseInstance',
                    name: 'BAE Mock Test',
                    courseMode: 'online',
                  },
                  {
                    '@type': 'CourseInstance',
                    name: 'QAFB Practice',
                    courseMode: 'online',
                  },
                ],
              },
              price: '0',
              priceCurrency: 'PKR',
              availability: 'InStock',
            },
          ],
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Preptio?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: "Preptio is Pakistan's free CA Foundation exam preparation platform built for ICAP students. It offers 4,000+ ICAP-aligned MCQs, timed mock exams, custom quiz builder, and performance analytics — all completely free.",
            },
          },
          {
            '@type': 'Question',
            name: 'Is Preptio free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Preptio is completely free. There is no subscription, no premium tier, and no hidden charges. All features including mock tests and analytics are free for all ICAP CA Foundation students.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which CA subjects does Preptio cover?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Preptio covers all four CA Foundation subjects: FOA (Fundamentals of Accounting), BAEIVI (Business & Economic Insights Vol I), BAEIV2E (Business & Economic Insights Vol II), and QAFB (Quantitative Analysis for Business).',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Preptio aligned with ICAP syllabus?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, all questions on Preptio are aligned with the ICAP CA Foundation syllabus. The BAE Mock Test replicates the real ICAP combined paper format with accurate question distribution.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the best website to practice CA Foundation MCQs in Pakistan?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Preptio (preptio.com) is the best free platform to practice CA Foundation MCQs in Pakistan. It is built specifically for ICAP students with 4,000+ aligned questions, mock tests, and performance analytics.',
            },
          },
        ],
      },
    ],
  }

  return (
    <main className="w-full">
      <Navigation />
      <Suspense fallback={null}>
        <LogoutToast />
      </Suspense>
      <HomepageContent />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
    </main>
  )
}
