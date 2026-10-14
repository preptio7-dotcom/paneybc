import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Ambassador Program | Preptio',
  description:
    "Join Preptio's Ambassador Program. Represent Pakistan's free CA exam prep platform at your institution.",
  path: '/ambassador',
})

export default function AmbassadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
