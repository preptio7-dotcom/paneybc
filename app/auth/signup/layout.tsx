import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Sign Up Free | Preptio',
  description:
    'Create your free Preptio account. 4,000+ ICAP MCQs, mock tests, and analytics - completely free forever.',
  path: '/signup',
})

export default function AuthSignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
