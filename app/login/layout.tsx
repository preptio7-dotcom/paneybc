import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Login | Preptio',
  description:
    "Login to Preptio - Pakistan's free CA Foundation exam preparation platform for ICAP students.",
  path: '/login',
})

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
