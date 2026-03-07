import Script from 'next/script'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      {children}
    </>
  )
}
