import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'About Our Mission',
    description: 'Learn about Preptio and our mission to help Chartered Accountant students master their exams with data-driven prep tools.',
}

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
