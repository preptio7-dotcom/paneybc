import type { Metadata } from 'next'
import AuthSignupPage from '../auth/signup/page'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Sign Up Free | Preptio',
  description:
    'Create your free Preptio account. 4,000+ ICAP MCQs, mock tests, and analytics - completely free forever.',
  path: '/signup',
})

export default function SignupPage() {
  return <AuthSignupPage />
}
