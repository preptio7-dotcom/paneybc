'use client'

import React from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function UnsupportedRegionPage() {
  return (
    <main className="min-h-screen bg-background-light flex flex-col">
      <Navigation />
      <div className="flex-grow pt-28 pb-20 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full border-border bg-white">
          <CardHeader>
            <CardTitle className="text-2xl text-text-dark">Service Not Available In Your Region</CardTitle>
            <CardDescription>
              This platform is currently available only for users in Pakistan.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-text-light space-y-2">
            <p>If you believe this is an error, please contact support with your current network details.</p>
            <p>Pakistan-based users: try disabling VPN/proxy and refresh the page.</p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  )
}

