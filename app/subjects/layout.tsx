import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
    title: 'Practice Subjects | Preptio - ICAP CA Foundation MCQs',
    description:
        'Practice CA Foundation subjects on Preptio. FOA, BAE Vol I & II, QAFB - chapter-wise and full book MCQs. Free for all ICAP students.',
    path: '/subjects',
})

export default function SubjectsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
