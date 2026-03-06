export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5583540622875378"
        crossOrigin="anonymous"
      />
      {children}
    </>
  )
}
