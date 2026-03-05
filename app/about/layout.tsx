import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
    title: 'About Preptio | Free CA Exam Prep Platform Pakistan',
    description:
        'Learn about Preptio - built for ICAP CA Foundation students in Pakistan. Free MCQ practice, mock exams and performance analytics.',
    path: '/about',
})

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
