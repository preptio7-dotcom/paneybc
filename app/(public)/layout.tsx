import Script from 'next/script'
import { AdBlockDetector } from '@/components/adblock-detector'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AdBlockDetector />
      {children}
    </>
  )
}
