import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'CA Exam Subjects',
    description: 'Explore the full CA curriculum with our extensive MCQ bank for every subject. Start practicing and track your progress.',
}

export default function SubjectsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
